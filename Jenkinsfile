pipeline {
    agent any

    tools {
        nodejs 'node-20' // This matches the name you set in Jenkins Global Tool Configuration
    }

    environment {
        YARN_CACHE_FOLDER = "${env.WORKSPACE}/.yarn-cache"
        // Adjust this if your Jenkins server is on Linux or a different user
        ANDROID_HOME = "/Users/apple/Library/Android/sdk"
        // Ensure Jenkins shell can find global commands like 'pod' (CocoaPods) installed via Homebrew or RubyGems
        PATH = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${env.PATH}"
        // Fix for CocoaPods "Unicode Normalization not appropriate for ASCII-8BIT" error
        LANG = "en_US.UTF-8"
        LC_ALL = "en_US.UTF-8"
    }

    stages {
        stage('Setup') {
            steps {
                echo 'Checking out code...'
                checkout scm
                
                echo 'Installing dependencies...'
                sh 'yarn install --frozen-lockfile'
            }
        }

        stage('Lint') {
            steps {
                echo 'Running linter...'
                sh 'yarn lint'
            }
        }

        // stage('Test & SonarQube') {
        //     steps {
        //         echo 'Running tests with coverage...'
        //         // Ensure Jest is configured to output lcov reports for Sonar
        //         sh 'yarn test:coverage'

        //         echo 'Running SonarQube analysis...'
        //         // Assumes SonarQube Scanner is available in path or configured as a Jenkins tool
        //         // with the environment name 'SonarQubeScanner' (can be adjusted)
        //         script {
        //             def scannerHome = tool 'SonarQubeScanner'
        //             withSonarQubeEnv('SonarQubeServer') { // Ensure 'SonarQubeServer' matches Jenkins config
        //                 sh "${scannerHome}/bin/sonar-scanner"
        //             }
        //         }
        //     }
        // }

        stage('Android Build') {
            steps {
                echo 'Building Android APK...'
                dir('android') {
                    // Ensures gradlew is executable
                    sh 'chmod +x gradlew'
                    sh './gradlew assembleRelease'
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'android/app/build/outputs/apk/release/*.apk', allowEmptyArchive: false
                }
            }
        }

        stage('iOS Build') {
            // Optional: Only run if we are on a macOS node
            when {
                expression { isUnix() && sh(script: 'uname -s', returnStdout: true).trim() == 'Darwin' }
            }
            steps {
                echo 'Building iOS App...'
                dir('ios') {
                    sh 'pod install'
                    // Basic xcodebuild command (adjust scheme and workspace as necessary)
                    sh '''
                    xcodebuild -workspace jestDemo.xcworkspace \
                               -scheme jestDemo \
                               -configuration Release \
                               -sdk iphonesimulator \
                               -destination 'platform=iOS Simulator,id=FFF7A3B6-591F-412E-BA87-0393E4FCD4A0' \
                               CODE_SIGN_IDENTITY="" \
                               CODE_SIGNING_REQUIRED=NO \
                               CODE_SIGNING_ALLOWED=NO \
                               build
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
            // Add Slack or Email notifications here
        }
        failure {
            echo 'Pipeline failed. Please review the logs.'
            // Add Slack or Email notifications here
        }
    }
}
