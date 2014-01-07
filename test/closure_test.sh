#!/bin/sh

set -e

if [ "$CLOSURE_JAR" == "" ]; then
  echo "Error: Must set CLOSURE_JAR: CLOSURE_JAR=(compiler.jar) $0" > /dev/stderr
  exit 1
fi

if [ ! \( -r "$CLOSURE_JAR" \) ]; then
  echo "Error: CLOSURE_JAR=$CLOSURE_JAR is not readable" > /dev/stderr
  exit 1
fi

SCRIPT_PATH="$( cd "$( dirname "$0" )" && pwd )"
CLOSURE_STRICT="--language_in ECMASCRIPT5_STRICT --warning_level VERBOSE --compilation_level ADVANCED_OPTIMIZATIONS --jscomp_error checkTypes"

java -jar $CLOSURE_JAR $CLOSURE_STRICT --externs $SCRIPT_PATH/externs_node.js $SCRIPT_PATH/../kew.js $SCRIPT_PATH/closure_test.js > /dev/null
if [ $? -ne 0 ]; then
  echo "FAILED"
  exit 1
else
  echo "SUCCESS"
fi
