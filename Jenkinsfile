// SahiSize CI/CD: verify (same checks as .github/workflows/ci.yml "verify" job),
// build the Docker image, smoke-test its headers and routing, push on main.
//
// Jenkins needs: Docker on the agent and a username/password credential with id 'docker-registry-creds'.
// Runs a command in a Node container against the workspace. Uses plain
// `docker run` so the Docker Pipeline plugin is not required.
def node24(String cmd) {
  sh """
    docker run --rm -u \$(id -u):\$(id -g) -v "\$PWD":/app -w /app \
      -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
      -e PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 -e ASTRO_TELEMETRY_DISABLED=1 \
      node:24-bookworm-slim ${cmd}
  """
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
    string(name: 'PUBLIC_SITE_URL', defaultValue: '', description: 'Canonical site origin baked into the build (blank = src/config/site.ts default)')
    string(name: 'HOST_PORT', defaultValue: '3003', description: 'Host port the deployed container listens on')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Run the image on this agent after the smoke test')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: true, description: 'Push the image when building main')
  }

  environment {
    IMAGE = "${params.REGISTRY}/${params.IMAGE_REPO}"
    TAG = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : env.BUILD_NUMBER}"
    SMOKE_NAME = "sahisize-smoke-${env.BUILD_NUMBER}"
    CONTAINER_NAME = 'sahisize'
  }

  stages {
    stage('Verify') {
      stages {
        stage('Install') { steps { node24 'npm ci' } }
        stage('Typecheck') { steps { node24 'npm run check' } }
        stage('Lint') { steps { node24 'npm run lint' } }
        stage('i18n + contrast + presets') {
          steps {
            node24 'npm run i18n:check'
            node24 'npm run contrast'
            node24 'npx vitest run --project node tests/contracts/presets-contract.test.ts'
            node24 'npm run presets:check'
          }
        }
        stage('Unit tests') { steps { node24 'npm test' } }
        stage('Build + budgets') {
          steps {
            node24 'npm run build'
            node24 'npm run budgets'
          }
        }
      }
    }

    stage('Docker build') {
      steps {
        sh """
          docker build \
            --build-arg PUBLIC_SITE_URL='${params.PUBLIC_SITE_URL}' \
            --label org.opencontainers.image.revision=${env.GIT_COMMIT ?: ''} \
            -t ${IMAGE}:${TAG} -t ${IMAGE}:latest .
        """
      }
    }

    stage('Smoke test') {
      steps {
        sh """
          docker run -d --rm --name ${SMOKE_NAME} --read-only --tmpfs /tmp ${IMAGE}:${TAG}
          for i in \$(seq 1 30); do
            docker exec ${SMOKE_NAME} wget -q --spider http://127.0.0.1:8080/healthz && break
            sleep 1
          done
          docker exec ${SMOKE_NAME} sh -ec '
            h() { wget -S -q -O /dev/null "http://127.0.0.1:8080\$1" 2>&1 || true; }
            h /         | grep -q "HTTP/1.1 200"
            h /         | grep -qi "X-Frame-Options: DENY"
            h /         | grep -qi "frame-ancestors"
            h /exams    | grep -q "HTTP/1.1 200"
            h /exams.html | grep -q "HTTP/1.1 301"
            h /exams/   | grep -q "HTTP/1.1 301"
            h /no-such-page | grep -q "HTTP/1.1 404"
            h /sw.js    | grep -qi "Cache-Control: no-cache"
          '
        """
      }
      post {
        always { sh "docker rm -f ${SMOKE_NAME} || true" }
      }
    }

    stage('Deploy') {
      when { expression { params.DEPLOY } }
      steps {
        sh """
          # Replaces the running site container; the image already passed the smoke test.
          docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
          docker run -d --name ${CONTAINER_NAME} --restart unless-stopped \
            --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true \
            -p ${params.HOST_PORT}:8080 ${IMAGE}:${TAG}
          for i in \$(seq 1 30); do
            curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:${params.HOST_PORT}/healthz && exit 0
            sleep 1
          done
          echo 'ERROR: site did not come up on port ${params.HOST_PORT}'
          docker logs --tail 100 ${CONTAINER_NAME} || true
          exit 1
        """
      }
    }

    stage('Push') {
      when {
        allOf {
          branch 'main'
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
            docker push "$IMAGE:latest"
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
      sh "docker image rm ${IMAGE}:${TAG} ${IMAGE}:latest || true"
      cleanWs()
    }
  }
}
