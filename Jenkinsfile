// SahiSize CI/CD
// Install -> Static checks -> Build -> Verify -> Docker image
// -> Canary health check -> Deploy -> Rollback if needed -> Cleanup
//
// Any branch can deploy when DEPLOY=true.

def node24(String cmd) {
    sh """
        docker run --rm -u \$(id -u):\$(id -g) \
          -v "\$PWD":/app -w /app \
          -e HOME=/tmp \
          -e npm_config_cache=/tmp/.npm \
          -e CI=true \
          -e NEXT_TELEMETRY_DISABLED=1 \
          -e SKIP_BUILD_CHECKS=1 \
          -e PUBLIC_SITE_URL='${params.PUBLIC_SITE_URL}' \
          node:24-bookworm-slim ${cmd}
    """
}

def waitHealthy(String name, int timeoutSec = 90) {
    def status = sh(
        returnStatus: true,
        script: """
            end=\$((\$(date +%s) + ${timeoutSec}))
            while [ \$(date +%s) -lt \$end ]; do
                s=\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ${name} 2>/dev/null || echo missing)

                case "\$s" in
                    healthy) exit 0 ;;
                    unhealthy|exited|dead|missing)
                        echo "Container ${name}: \$s"
                        exit 1
                        ;;
                esac
                sleep 2
            done

            echo "Container ${name}: health check timeout"
            exit 1
        """
    )

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
        string(
            name: 'IMAGE_REPO',
            defaultValue: 'sahisize',
            description: 'Docker image repository'
        )

        string(
            name: 'PUBLIC_SITE_URL',
            defaultValue: 'https://sahisize.online',
            description: 'Canonical website URL'
        )

        string(
            name: 'HOST_PORT',
            defaultValue: '3004',
            description: 'Live application port'
        )

        string(
            name: 'CANARY_PORT',
            defaultValue: '3013',
            description: 'Canary health-check port'
        )

        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Deploy from any branch when enabled'
        )
    }

    environment {
        IMAGE = "${params.IMAGE_REPO}"
        TAG = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : env.BUILD_NUMBER}"
        CONTAINER_NAME = 'sahisize'
        CANARY_NAME = 'sahisize-canary'
        DOCKER_BUILDKIT = '1'
    }

    stages {

        stage('Debug Branch') {
            steps {
                script {
                    echo "BRANCH_NAME = ${env.BRANCH_NAME}"
                    echo "GIT_BRANCH = ${env.GIT_BRANCH}"
                    echo "GIT_COMMIT = ${env.GIT_COMMIT}"
                    echo "DEPLOY = ${params.DEPLOY}"
                }
            }
        }

        stage('Install') {
            steps {
                node24 'npm ci'
            }
        }

        stage('Static checks') {
            parallel {

                stage('Lint') {
                    steps {
                        node24 'npm run lint'
                    }
                }

                stage('Typecheck') {
                    steps {
                        node24 'npm run typecheck'
                    }
                }

                stage('Content') {
                    steps {
                        node24 'npm run presets:check'
                        node24 'npm run i18n:check'
                        node24 'npm run check:contrast'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                node24 'npm run build'

                sh '''
                    if [ -e out ]; then
                        echo "ERROR: Static export out/ is not allowed."
                        exit 1
                    fi

                    if [ ! -d .next/standalone ]; then
                        echo "ERROR: .next/standalone missing."
                        exit 1
                    fi
                '''
            }
        }

        stage('Verify build') {
            parallel {

                stage('Budgets') {
                    steps {
                        node24 'npm run check:budgets'
                    }
                }

                stage('Routes') {
                    steps {
                        node24 'npm run check:routes'
                    }
                }
            }
        }

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
                expression {
                    return params.DEPLOY
                }
            }

            steps {
                script {

                    // 1. Start canary container

                    sh """
                        docker rm -f ${CANARY_NAME} 2>/dev/null || true

                        docker run -d \
                          --name ${CANARY_NAME} \
                          --read-only \
                          --tmpfs /tmp \
                          --tmpfs /app/.next/cache:uid=1000,gid=1000 \
                          --cap-drop ALL \
                          --security-opt no-new-privileges:true \
                          -p 127.0.0.1:${params.CANARY_PORT}:3004 \
                          ${IMAGE}:${TAG}
                    """

                    def canaryOk = waitHealthy(env.CANARY_NAME)

                    if (canaryOk) {
                        canaryOk = sh(
                            returnStatus: true,
                            script: "curl -fsS -o /dev/null http://127.0.0.1:${params.CANARY_PORT}/"
                        ) == 0
                    }

                    if (!canaryOk) {
                        sh """
                            docker logs --tail 200 ${CANARY_NAME} || true
                            docker rm -f ${CANARY_NAME} || true
                        """

                        error('Canary failed. Live container was not touched.')
                    }

                    sh "docker rm -f ${CANARY_NAME}"

                    // 2. Save previous live image for rollback

                    def previous = sh(
                        returnStdout: true,
                        script: """
                            docker inspect -f '{{.Image}}' ${CONTAINER_NAME} 2>/dev/null || true
                        """
                    ).trim()

                    def haveRollback = false

                    if (previous) {
                        haveRollback = sh(
                            returnStatus: true,
                            script: "docker tag ${previous} ${IMAGE}:previous"
                        ) == 0
                    }

                    // 3. Deployment function

                    def runLive = { String image ->

                        sh """
                            docker rm -f ${CONTAINER_NAME} 2>/dev/null || true

                            docker run -d \
                              --name ${CONTAINER_NAME} \
                              --restart unless-stopped \
                              --init \
                              --read-only \
                              --tmpfs /tmp \
                              --tmpfs /app/.next/cache:uid=1000,gid=1000 \
                              --cap-drop ALL \
                              --security-opt no-new-privileges:true \
                              --memory 512m \
                              --pids-limit 256 \
                              --log-opt max-size=10m \
                              --log-opt max-file=3 \
                              -p 127.0.0.1:${params.HOST_PORT}:3004 \
                              ${image}
                        """
                    }

                    // 4. Deploy new image

                    runLive("${IMAGE}:${TAG}")

                    if (!waitHealthy(env.CONTAINER_NAME)) {

                        sh "docker logs --tail 200 ${CONTAINER_NAME} || true"

                        if (haveRollback) {
                            echo "Rolling back to ${IMAGE}:previous"

                            runLive("${IMAGE}:previous")

                            if (!waitHealthy(env.CONTAINER_NAME)) {
                                error('Deployment failed and rollback health check also failed.')
                            }
                        } else {
                            error('Deployment failed. No previous image available for rollback.')
                        }

                        error('New deployment failed. Previous version restored.')
                    }

                    // 5. Update latest tag only after successful health check

                    sh "docker tag ${IMAGE}:${TAG} ${IMAGE}:latest"

                    echo "Deployment successful!"
                    echo "Branch: ${env.BRANCH_NAME ?: env.GIT_BRANCH}"
                    echo "Image: ${IMAGE}:${TAG}"
                }
            }
        }
    }

    post {
        always {
            script {

                // Remove canary if it remains

                sh """
                    docker rm -f ${CANARY_NAME} 2>/dev/null || true
                """

                // Keep live and rollback images.
                // Remove other images created by this pipeline.

                sh """
                    live=\$(docker inspect -f '{{.Image}}' ${CONTAINER_NAME} 2>/dev/null || true)

                    docker image ls ${IMAGE} --format '{{.Repository}}:{{.Tag}}' |
                    grep -v -e ':previous\$' -e ':latest\$' -e ':${TAG}\$' |
                    while read -r ref; do
                        id=\$(docker image inspect -f '{{.Id}}' "\$ref" 2>/dev/null || true)

                        [ "\$id" = "\$live" ] || docker image rm "\$ref" 2>/dev/null || true
                    done

                    docker image prune -f >/dev/null 2>&1 || true
                """

                // Remove current build tag only when deploy is disabled.
                // Keep successfully deployed image tags.

                if (!params.DEPLOY) {
                    sh "docker image rm ${IMAGE}:${TAG} 2>/dev/null || true"
                }

                cleanWs()
            }
        }
    }
}
