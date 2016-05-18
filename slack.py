#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
slack.py
A Flask application backend that connects
the user interface with Slack's Web API
"""
import json
import requests
from flask import jsonify
from chartbuilder_server import *

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings


def set_auth_token(code):
    """
    Gets and returns a Slack token to be saved in the current session
    """
    slack_params = {
        'client_id': settings.SLACK_CLIENT_ID,
        'client_secret': settings.SLACK_CLIENT_SECRET,
        'code': code
    }
    resp = requests.get("https://slack.com/api/oauth.access", params=slack_params)
    resp_content = resp.json()
    print resp_content

    # If the Slack response is good, store the token as a session variable.
    if resp_content['ok'] is True:
        # Return the generated token
        return resp_content['access_token']
    #  If the response is bad then return some sort of error
    else:
        r = jsonify({"message": "Error connecting to Slack"})
        r.status_code = 400
        return r


def send_message():
    """
    Prepares and sends a Slack notification to our graphics group.
    """
    with chartbuilder_server.app_context():
        message = {
            "channel": "#graphics-requests",
            "username": "Chartbuilder-bot",
            "text": "Please review and edit my chart - *Chart name will go here* *P2P admin URL will go here*."
        }
        resp = requests.post("https://slack.com/api/chat.postMessage", params=message)
        resp_content = resp.json()

        # if the Slack response is good, store the token as a session variable
        if resp_content['ok'] is True:
            # return the generated token
            r = jsonify(resp_content)
            r.status_code = 200
            return r
        # if the response is bad then return some sort of error
        else:
            r = jsonify(resp_content)
            r.message = "Error Connecting to Slack"
            r.status_code = 400
            return r


