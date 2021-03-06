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


def prep_slack_message(slug, created):
    """
    If a new chart is created, send a slack message alerting people.
    If it's only updated, don't send an alert.
    """
    chart_url = '%schartbuilder/?jsonurl=%s.json' % (settings.STOCKSERVER_URL, slug)
    if created:
        msg = "<!here> *New chart created: %s* Please review and edit. You can edit the chart by following this link *<%s|%s>*" % (slug, chart_url, slug)
    else:
        msg = "*Chart edited: <%s|%s>* " % (chart_url, slug)

    return msg


def send_message(msg):
    """
    Prepares and sends a Slack notification to our graphics group.
    """
    message = {
        "channel": "#graphics-requests",
        "username": "Chartbuilder-bot",
        "text": msg
    }
    resp = requests.post(settings.SLACK_HOOK_URL, data={"payload":json.dumps(message)})

    # app.logger.debug(resp.status_code)

    if resp.status_code is 200:
        return True
    else:
        return False


