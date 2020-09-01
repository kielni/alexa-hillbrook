#!/bin/bash

cp requirements.txt deploy
cp hillbrook_calendar/*.py deploy
cd deploy
echo "-- dependencies"
pip install -r requirements.txt -t .
echo
echo "-- zipping"
zip -r ../deploy.zip . --exclude=*__pycache__*
cd ..
echo
echo "-- updating hillbrookcalendar lambda"
aws lambda update-function-code --function-name hillbrookcalendar --region us-east-1 --zip-file fileb://deploy.zip
echo
echo "-- updating hillbrook-calendar-cache lambda"
aws lambda update-function-code --function-name hillbrook-calendar-cache --region us-east-1 --zip-file fileb://deploy.zip

aws lambda invoke --function-name hillbrook-calendar-cache response.json ; cat response.json
#aws lambda invoke --function-name hillbrookcalendar response.json ; cat response.json
