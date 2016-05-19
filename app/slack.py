#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
slack.py
A Flask application backend that connects
the user interface with Slack's Web API
"""
import json
import requests
import urllib
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


def prep_slack_message(slug):
    chart_link = urllib.quote("%schartbuilder-storage/%s/%s.json" % (settings.STOCKSERVER_URL, slug, slug), safe='')
    chart_url = '%s?jsonurl=%s' % (settings.STOCKSERVER_URL, chart_link)
    msg = "<!here> *New chart created: %s* Please review and edit. You can edit the chart by following this link *<%s|%s>*" % (slug, chart_url, slug)

    return msg


def send_message(msg):
    """
    Prepares and sends a Slack notification to our graphics group.
    """
    # token = slack.set_auth_token()
    message = {
        "channel": "#graphics-request-test",
        "username": "Chartbuilder-bot",
        "text": msg
    }
    resp = requests.post(settings.SLACK_HOOK_URL, data={"payload":json.dumps(message)})

    app.logger.debug(resp.status_code)

    if resp.status_code is 200:
        return True
    else:
        return False


