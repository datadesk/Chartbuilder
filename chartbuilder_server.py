#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
chartbuilder_server.py
A Flask application backend that connects
Chartbuilder's interface with P2P's API
Allowing us to publish charts directly to P2P.
"""
import base64
import p2p
import requests
import slack
from bs4 import BeautifulSoup
from datetime import timedelta
from flask import Flask
from flask import jsonify
from flask import json
from flask import redirect
from flask import request
from flask import make_response
from flask import current_app
from functools import update_wrapper

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings

app = Flask(__name__)


def crossdomain(origin=None, methods=None, headers=None, max_age=21600,
                attach_to_all=True, automatic_options=True):
    """
    Crossdomain decorator so that the Flask server can talk to the nodejs app server.
    """
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods

        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp

            h = resp.headers

            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)

            if headers is not None:
                h['Access-Control-Allow-Headers'] = headers

            return resp

        f.provide_automatic_options = False

        return update_wrapper(wrapped_function, f)

    return decorator


def clean_for_p2p(html):
    """
    This helper function returns a standardized encoding for HTML to be passed
    into p2p to avoid exceptions and upside down question marks.
    """
    soup = BeautifulSoup(html, "html.parser")
    converted_str = soup.encode("latin-1", "xmlcharrefreplace")
    return unicode(converted_str, "latin-1")


def get_p2p_connection():
    """
    Returns a working P2P API connection, currently configured to use
    the stage site.
    """
    app.logger.debug("getting p2p connection")
    return p2p.P2P(
        settings.P2P_API_KEY,
        url=settings.P2P_API_URL,
        product_affiliate_code='lanews',
        source_code='latimes',
        preserve_embedded_tags=False,
        debug=True,
        state_filter='live,working,pending,copyready'
    )


def get_object_or_none(slug):
    """
    Attempts to retrieve the provided slug via the P2P API.

    If it exists, return it as the dictionary provided by the API.

    If it doesn't exist, return None.
    """
    app.logger.debug("get_object_or_none(%s)" % slug)
    conn = get_p2p_connection()
    slug = slug.strip()

    try:
        app.logger.debug("conn.get_fancy_content_item(%s)" % slug)
        # Custom query params to get the data we need
        query = {
            "product_affiliate_code": conn.product_affiliate_code,
            "source_code": conn.source_code,
            "content_item_state_code": "all",
            "include": [
                "static_collections",
                "related_items",
                "embedded_items",
                "parent_related_items",
                "programmed_custom_params",
                "web_url",
                "geocodes",
                "notes"
            ],
        }
        return conn.get_fancy_content_item(slug, query)
    except p2p.P2PNotFound:
        return None


def slug_exists(slug):
    """
    Accepts a P2P slug and tests whether it exists. Returns True or False.
    """
    app.logger.debug('slug_exists()')
    conn = get_p2p_connection()
    try:
        logger.debug("conn.get_fancy_content_item(%s)" % slug.strip())
        conn.get_fancy_content_item(slug.strip())
        return True
    except p2p.P2PNotFound:
        return False


def prep_p2p_blurb_payload(data):
    """
    Accepts a data dictionary POSTed by the chartbuilder interface and transforms
    it into the data structure expected by P2P's API.
    """
    # start things off
    payload = {
        'slug': data['slug'] + "-chartbuilder",
        'title': data['slug'],
        'content_item_type_code': 'blurb',
        'content_item_state_code': 'working'
    }

    # Decode the base64-encoded string into an SVG file
    base64n =  data['data'].index("base64,")
    body_content = data['data']
    body_content = base64.decodestring(body_content[base64n + 7:])
    body_content_cleaned = clean_for_p2p(body_content)

    context = {
        'elements': body_content_cleaned
    }

    # Render the HTML for body and add that
    payload['body'] = context['elements']

    # Pass it out
    return payload


def update_or_create_chartblurb(data):
    """
    Accepts data from a POST or PUT request and syncs it with P2P

    Returns a tuple with a boolean indicating if an object was created
    followed by the P2P object itself
    """
    app.logger.debug("update_or_create_chartblurb(data)")

    # Try to get the slug from P2P
    slug = data['slug'] + "-chartbuilder"
    slug = slug.strip()

    # check if the blurb exists
    obj = get_object_or_none(slug)

    app.logger.debug("prepping payload")

    # prep the data for P2P
    payload = prep_p2p_blurb_payload(data)

    # Get a P2P connection ready to go
    conn = get_p2p_connection()

    # If a P2P record already exists...
    if obj:
        # ... update it
        app.logger.debug("updating content item %s" % slug)
        conn.update_content_item(payload, slug)
        created = False
    # if it doesn't already exist...
    else:
        # ... create it
        app.logger.debug("creating content item %s" % slug)
        try:
            conn.create_content_item(payload)
            created = True
            msg = slack.prep_slack_message(slug)
            slack.send_message(msg)
            app.logger.debug("created content item")
        except Exception as e:
            app.logger.debug("oops")
            app.logger.debug(e)


    # return the created bool with the updated object
    return created, get_object_or_none(slug)


@app.route('/send-slack-message/')
def send_slack_message():
    slug = request.args.get("slug")
    if slug:
        msg = slack.prep_slack_message(slug)
    else:
        msg = slack.prep_slack_message("la-g-enter-chart-title-erew-2016-05-17")

    r = slack.send_message(msg)

    if r is True:
        return "Slack message sent!"
    else:
        return "Error sending Slack message"



@app.route('/send-to-p2p/', methods=["POST"])
@crossdomain(origin="*")
def send_to_p2p():
    """
    Saves the SVG of a chart as a blurb in P2P
    """
    app.logger.debug("sending to P2P")
    # Make a generic response object
    r = make_response("hello, world!")
    # r.headers['Access-Control-Allow-Origin'] = "*"
    # return r

    # We should be POSTing
    if request.method in ["POST", "PUT"]:
        # Pull the data from the latest POST request
        app.logger.debug("attempting to post")
        data = request.form

        try:
            app.logger.debug("try. trying hard.")
            created, obj = update_or_create_chartblurb(data)
            content = {
                "message": "Updated in P2P",
                "created": created,
                "p2p_blurb": obj,
            }
            app.logger.debug("Created object in P2P!")
            app.logger.debug(created, obj)
            # return r
        except Exception as e:
            app.logger.debug("Exception!")
            # Return the exception if it fails
            content = {"message": str(e)}
            r = jsonify(content)
            r.status_code = 500
            return r

    return "Sending to p2p!"


@app.route('/get-p2p-admin-url/')
def get_p2p_admin_url():
    """
    Get the P2P admin URL for an exported chart.
    """
    app.logger.debug(request.args.get('slug'))
    slug = "%s-chartbuilder" % request.args.get("slug")
    conn = get_p2p_connection()

    try:
        app.logger.debug("conn.get_content_item(%s)" % slug.strip())
        content_item = conn.get_content_item(slug.strip())
        content_item_id = content_item["id"]
        url = '%s/content_items/%s/edit' % (settings.P2P_BASE_URL, content_item_id)
        return redirect(url, code=302)
    except p2p.P2PNotFound:
        return False


@app.route('/save-to-server/')
@crossdomain(origin="*")
def save_to_server():
    """
    Meant to replace PHP script that writes to stockserver.
    One day.
    """
    return "hello world!"


if __name__ == '__main__':
    app.run(debug=True)
