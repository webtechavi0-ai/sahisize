// SahiSize CI/CD.
//
// install -> lint -> typecheck -> test -> content checks -> build (once, fails if out/ appears) -> budgets + routes
// against that build -> docker image from the same build -> deploy (main only, health-gated).
//
// Every Node step runs in node:24-bookworm-slim, the same base as the runtime image, so the
// standalone output (incl. native deps such as @resvg/resvg-js) is packaged as is.

def node24(String cmd) {
  sh """
    docker run --rm -u \$(id -u):\$(id -g) -v "\$PWD":/app -w /app \
      -e HOME=/tmp -e npm_config_cache=/tmp/.npm -e CI=true \
      -e NEXT_TELEMETRY_DISABLED=1 \
      -e SKIP_BUILD_CHECKS=1 \
      -e PUBLIC_SITE_URL='${params.PUBLIC_SITE_URL}' \
      node:24-bookworm-slim ${cmd}
  """
}

def isMain() {
  return env.BRANCH_NAME == 'main' || env.GIT_BRANCH == 'main' || env.GIT_BRANCH == 'origin/main'
}

// Polls the container's Docker HEALTHCHECK until healthy; returns false on unhealthy/exit/timeout.
def waitHealthy(String name, int timeoutSec = 90) {
  def status = sh(returnStatus: true, script: """
    end=\$((\$(date +%s) + ${timeoutSec}))
    while [ \$(date +%s) -lt \$end ]; do
      s=\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ${name} 2>/dev/null || echo missing)
      case "\$s" in
        healthy) exit 0 ;;
        unhealthy|exited|dead|missing) echo "container ${name}: \$s"; exit 1 ;;
      esac
      sleep 2
    done
    echo "container ${name}: not healthy after ${timeoutSec}s"; exit 1
  """)
  return status == 0
}

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds(abortPrevious: true)
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    string(name: 'REGISTRY', defaultValue: 'docker.io', description: 'Registry host')
    string(name: 'IMAGE_REPO', defaultValue: 'illumin/sahisize', description: 'Image repository')
    string(name: 'PUBLIC_SITE_URL', defaultValue: 'https://sahisize.online', description: 'Canonical site origin baked into canonicals, hreflang, sitemaps and robots.txt')
    string(name: 'HOST_PORT', defaultValue: '3003', description: 'Loopback port nginx proxies to')
    string(name: 'CANARY_PORT', defaultValue: '3013', description: 'Loopback port used to health-check a new image before the swap')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy on this agent (main branch only)')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: true, description: 'Push the image (main branch only)')
  }

  environment {
    IMAGE = "${params.REGISTRY}/${params.IMAGE_REPO}"
    TAG = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : env.BUILD_NUMBER}"
    CONTAINER_NAME = 'sahisize'
    CANARY_NAME = 'sahisize-canary'
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Install') {
      steps { node24 'npm ci' }
    }

    stage('Lint') {
      steps { node24 'npm run lint' }
    }

    stage('Typecheck') {
      steps { node24 'npm run typecheck' }
    }

    stage('Test') {
      steps { node24 'npm test' }
    }

    stage('Content checks') {
      steps {
        node24 'npm run presets:check'
        node24 'npm run i18n:check'
        node24 'npm run check:contrast'
      }
    }

    // The only `next build` of the pipeline. postbuild makes .next/standalone self-contained.
    stage('Build') {
      steps {
        node24 'npm run build'
        // The app ships as a Node server (output: 'standalone'). A static export (out/) must never
        // be produced, whatever changed in next.config.mjs or the scripts.
        sh '''
          if [ -e out ]; then
            echo "ERROR: out/ exists after the build. Static export is not allowed; use output: 'standalone'."
            exit 1
          fi
        '''
      }
    }

    stage('Verify build') {
      parallel {
        stage('Budgets') { steps { node24 'npm run check:budgets' } }
        stage('Routes') { steps { node24 'npm run check:routes' } }
      }
    }

    // Packages the verified .next/standalone; nothing is rebuilt inside Docker.
    stage('Docker image') {
      steps {
        sh """
          docker build \
            --target runtime-prebuilt \
            --build-context standalone=.next/standalone \
            --build-arg GIT_COMMIT=${env.GIT_COMMIT ?: ''} \
            -t ${IMAGE}:${TAG} .
        """
      }
    }

    stage('Deploy') {
      when {
        allOf {
          expression { isMain() }
          expression { params.DEPLOY }
        }
      }
      steps {
        script {
          // 1. Canary: run the new image on a spare loopback port and wait for its health check.
          sh """
            docker rm -f ${CANARY_NAME} 2>/dev/null || true
            docker run -d --name ${CANARY_NAME} \
              --read-only --tmpfs /tmp --tmpfs /app/.next/cache:uid=1000,gid=1000 \
              --cap-drop ALL --security-opt no-new-privileges:true \
              -p 127.0.0.1:${params.CANARY_PORT}:3003 ${IMAGE}:${TAG}
          """
          def canaryOk = waitHealthy(env.CANARY_NAME)
          if (canaryOk) {
            canaryOk = sh(returnStatus: true, script: "curl -fsS -o /dev/null http://127.0.0.1:${params.CANARY_PORT}/") == 0
          }
          if (!canaryOk) {
            sh "docker logs --tail 200 ${CANARY_NAME} || true; docker rm -f ${CANARY_NAME} || true"
            error('New image failed its health check; the live container was not touched.')
          }
          sh "docker rm -f ${CANARY_NAME}"

          // 2. Remember the live image for rollback (kept tagged as :previous).
          def previous = sh(returnStdout: true,
            script: "docker inspect -f '{{.Config.Image}}' ${CONTAINER_NAME} 2>/dev/null || true").trim()
          if (previous) {
            sh "docker tag ${previous} ${IMAGE}:previous"
          }

          // 3. Swap on the live port (a few seconds of downtime while the port changes hands).
          def runLive = { String image ->
            sh """
              docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
              docker run -d --name ${CONTAINER_NAME} --restart unless-stopped --init \
                --read-only --tmpfs /tmp --tmpfs /app/.next/cache:uid=1000,gid=1000 \
                --cap-drop ALL --security-opt no-new-privileges:true \
                --memory 512m --pids-limit 256 \
                --log-opt max-size=10m --log-opt max-file=3 \
                -p 127.0.0.1:${params.HOST_PORT}:3003 ${image}
            """
          }
          runLive("${IMAGE}:${TAG}")
          if (!waitHealthy(env.CONTAINER_NAME)) {
            sh "docker logs --tail 200 ${CONTAINER_NAME} || true"
            if (previous) {
              echo "Rolling back to ${IMAGE}:previous"
              runLive("${IMAGE}:previous")
              waitHealthy(env.CONTAINER_NAME)
            }
            error('Deployed container did not become healthy; rolled back.')
          }
          sh "docker tag ${IMAGE}:${TAG} ${IMAGE}:latest"
        }
      }
    }

    stage('Push') {
      when {
        allOf {
          expression { isMain() }
          expression { params.PUSH_IMAGE }
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-registry-creds',
                                          usernameVariable: 'REG_USER',
                                          passwordVariable: 'REG_PASS')]) {
          sh '''
            echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
            docker push "$IMAGE:$TAG"
            if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then docker push "$IMAGE:latest"; fi
          '''
        }
      }
      post {
        always { sh 'docker logout "$REGISTRY" || true' }
      }
    }
  }

  post {
    always {
      script {
        // Never untag what is running (:TAG on main) or the rollback image (:previous).
        // Non-main builds leave nothing behind; on main, drop tags older than current/previous.
        if (!isMain() || !params.DEPLOY) {
          sh "docker image rm ${IMAGE}:${TAG} 2>/dev/null || true"
        } else {
          sh """
            live=\$(docker inspect -f '{{.Config.Image}}' ${CONTAINER_NAME} 2>/dev/null || true)
            docker image ls ${IMAGE} --format '{{.Repository}}:{{.Tag}}' \
              | grep -v -e ':previous\$' -e ':latest\$' -e ":${TAG}\$" \
              | while read -r ref; do
                  [ "\$ref" = "\$live" ] || docker image rm "\$ref" 2>/dev/null || true
                done
          """
        }
        sh 'docker image prune -f >/dev/null 2>&1 || true'
      }
      cleanWs()
    }
  }
}
