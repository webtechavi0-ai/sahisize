// SahiSize CI/CD: verify (same checks as .github/workflows/ci.yml "verify" job),
// build the Docker image, smoke-test its headers and routing, push on main.
//
// Jenkins needs: Docker on the agent, the Docker Pipeline plugin, and a
// username/password credential with id 'docker-registry-creds'.
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
    booleanParam(name: 'PUSH_IMAGE', defaultValue: true, description: 'Push the image when building main')
  }

  environment {
    IMAGE = "${params.REGISTRY}/${params.IMAGE_REPO}"
    TAG = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : env.BUILD_NUMBER}"
    SMOKE_NAME = "sahisize-smoke-${env.BUILD_NUMBER}"
  }

  stages {
    stage('Verify') {
      agent {
        docker {
          image 'node:24-bookworm-slim'
          args '-e HOME=/tmp -e npm_config_cache=/tmp/.npm'
          reuseNode true
        }
      }
      environment {
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
        ASTRO_TELEMETRY_DISABLED = '1'
      }
      stages {
        stage('Install') { steps { sh 'npm ci' } }
        stage('Typecheck') { steps { sh 'npm run check' } }
        stage('Lint') { steps { sh 'npm run lint' } }
        stage('i18n + contrast + presets') {
          steps {
            sh 'npm run i18n:check'
            sh 'npm run contrast'
            sh 'npx vitest run --project node tests/contracts/presets-contract.test.ts'
            sh 'npm run presets:check'
          }
        }
        stage('Unit tests') { steps { sh 'npm test' } }
        stage('Build + budgets') {
          steps {
            sh 'npm run build'
            sh 'npm run budgets'
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
