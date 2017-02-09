#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
chartbuilder_server.py
A Flask application backend that connects
Chartbuilder's interface with P2P's API
Allowing us to publish charts directly to P2P.
"""
import base64
import boto
import os
import p2p
import slack
import shutil
import sys
import urllib
from bs4 import BeautifulSoup
from datetime import timedelta
from flask import current_app
from flask import Flask
from flask import jsonify
from flask import json
from flask import redirect
from flask import request
from flask import make_response
from flask import render_template
from flask import send_from_directory
from functools import update_wrapper
from uuid import uuid4
from werkzeug.utils import secure_filename


try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings

app = Flask(__name__, static_url_path='')
app.debug=True


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


def s3_upload(name, data, upload_dir=settings.S3_UPLOAD_DIRECTORY, acl='public-read'):
    """
    Uploads a file object to S3.

    Expects following attributes from your settings file to be set:
        S3_KEY              :   S3 API Key
        S3_SECRET           :   S3 Secret Key
        S3_BUCKET           :   What bucket to upload to
        S3_UPLOAD_DIRECTORY :   Which S3 Directory.
    """

    # Connect to S3 and upload file.
    conn = boto.connect_s3(settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY)
    b = conn.get_bucket(settings.AWS_BUCKET_NAME)

    sml = b.new_key("/".join([upload_dir, name]))
    sml.set_contents_from_string(data)
    sml.set_acl(acl)
    app.logger.debug("Image uploaded to S3")

    return name


def get_s3_url(slug):
    conn = boto.connect_s3(settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY)
    b = conn.get_bucket(settings.AWS_BUCKET_NAME)

    app.logger.debug("getting s3 url")

    filename = "%s.png" % slug
    key_name = "/".join([settings.S3_UPLOAD_DIRECTORY, filename])

    app.logger.debug(filename)
    app.logger.debug(key_name)

    k = boto.s3.key.Key(b, key_name)
    url = k.generate_url(expires_in=300)
    app.logger.debug(url)

    return url


def clean_for_p2p(html):
    """
    This helper function returns a standardized encoding for HTML to be passed
    into p2p to avoid exceptions and upside down question marks.
    """
    soup = BeautifulSoup(html, "html.parser")
    converted_str = soup.encode("latin-1", "xmlcharrefreplace")
    # Remove tabs, newlines and spaces to fix possible display issues in Firefox
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


def prep_p2p_image_payload(data):
    """
    Accepts a data dictionary POSTed by the chartbuilder interface and transforms
    it into the data structure expected by P2P's API.
    """
    # start things off
    slug = data['slug']
    url = get_s3_url(slug)

    payload = {
        'slug': slug,
        'title': data['slug'],
        'content_item_type_code': 'photo',
        'content_item_state_code': 'working',
        'photo_upload': {
            'alt_thumbnail': {
                'url': url,
            }
        }
    }

    # Pass it out
    return payload


def prep_p2p_blurb_payload(data):
    """
    Accepts a data dictionary POSTed by the chartbuilder interface and transforms
    it into the data structure expected by P2P's API.
    """
    # start things off
    slug = data['slug']
    url = get_s3_url(slug)

    payload = {
        'slug': slug,
        'title': data['slug'],
        'content_item_type_code': 'blurb',
        'content_item_state_code': 'working',
        'custom_param_data': {
            'ratio-above-840': data['ratio'],
            'ratio-420-840': data['ratio'],
            'ratio-below-420': data['ratio'],
        },
        'photo_upload': {
            'alt_thumbnail': {
                'url': url,
            }
        }
    }

    # Decode the base64-encoded string into an SVG file
    # In some cases there won't be the base64 prefix,
    # So also handle that case
    try:
        base64n = data['data'].index("base64,")
        body_content = data['data']
        body_content = base64.decodestring(body_content[base64n + 7:])
    except ValueError:
        body_content = data['data']
        body_content = urllib.unquote(base64.decodestring(body_content))

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
    p2p_slug = data['slug'].strip()
    # p2p_slug = slug

    # check if the blurb exists
    obj = get_object_or_none(p2p_slug)

    app.logger.debug("prepping payload")

    # prep the data for P2P
    if data['source'] != "mapmaker":
        payload = prep_p2p_blurb_payload(data)
    else:
        payload = prep_p2p_image_payload(data)

    # Get a P2P connection ready to go
    conn = get_p2p_connection()

    # If a P2P record already exists...
    if obj:
        # ... update it
        app.logger.debug("updating content item %s" % p2p_slug)
        app.logger.debug(payload)
        # Set to the content item's code
        payload['content_item_state_code'] = obj['content_item_state_code']
        conn.update_content_item(payload, p2p_slug)
        created = False
    # if it doesn't already exist...
    else:
        # ... create it
        app.logger.debug("creating content item %s" % p2p_slug)
        try:
            conn.create_content_item(payload)
            created = True

            # Add into collection
            conn.push_into_collection('la-me-graphics-pathing', [p2p_slug])

            app.logger.debug("created content item")
        except Exception as e:
            app.logger.debug("oops")
            app.logger.debug(e)

    # return the created bool with the updated object
    return created, get_object_or_none(p2p_slug)


def sorted_ls(path):
    """
    Returns a list of directories in order of last modified
    """
    mtime = lambda f: os.stat(os.path.join(path, f)).st_mtime
    return reversed(list(sorted(os.listdir(path), key=mtime)))


@app.route('/')
def index():
    """
    The main Chartbuilder page.
    """
    return render_template('index.html')


@app.route('/storage/')
def storage():
    """
    The main Chartbuilder page.
    """
    storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chartbuilder-storage')
    dirs = sorted_ls(storage_dir)
    app.logger.debug(dirs)
    return render_template('storage.html', dirs_list=dirs)


@app.route('/chartbuilder-storage/<path:path>')
def custom_static(path):
    media_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chartbuilder-storage')
    return send_from_directory(media_path , path)


@app.route('/send-slack-message/')
def send_slack_message():
    slug = request.args.get("slug")
    if slug:
        msg = slack.prep_slack_message(slug)
    else:
        msg = slack.prep_slack_message("la-g-chart-test")

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

            # print data.get('source', None)
            slug = data['slug']

            # Only send to Slack if this is coming from Chartbuilder
            if data['source'] != 'blurbinator' and created:
                msg = slack.prep_slack_message(slug, created)
                slack.send_message(msg)

            app.logger.debug("Created object in P2P!")

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
    slug = request.args.get("slug")
    conn = get_p2p_connection()

    try:
        app.logger.debug("conn.get_content_item(%s)" % slug.strip())
        content_item = conn.get_content_item(slug.strip())
        content_item_id = content_item["id"]
        url = '%s/content_items/%s/edit' % (settings.P2P_BASE_URL, content_item_id)
        return redirect(url, code=302)

    except p2p.P2PNotFound:
        return "The item <strong>%s</strong> was not found in P2P" % slug


@app.route('/svg-uploader/')
def blurbinator():
    """
    Upload an SVG directly to P2P, setting the aspect ratio parameters
    based on the SVG.
    """
    return render_template('svg-uploader.html')


@app.route('/faq/')
def faq():
    """
    Upload an SVG directly to P2P, setting the aspect ratio parameters
    based on the SVG.
    """
    return render_template('faq.html')


@app.route('/save-to-s3/', methods=["POST"])
@crossdomain(origin="*")
def save_to_s3():
    """
    Saves an object to S3
    """
    if request.method in ["POST", "PUT"]:
        data = request.form
        name = data['name'].strip()
        filedata = data['filedata'].strip()

        app.logger.debug("saving file to S3")

        # Trim base64 prefix from encoded file
        filepos = filedata.find("base64,", 0, 50)
        if filepos > -1:
            filedata = filedata[filepos + len("base64,"):]

        # Decode base64 string
        filedata_decoded = base64.decodestring(urllib.unquote(filedata))
        s3_upload(name, filedata_decoded)

        return "Chart image uploaded to S3"



@app.route('/save-to-server/', methods=["POST"])
@crossdomain(origin="*")
def save_to_server():
    """
    Meant to replace PHP script that writes to stockserver.
    """
    if request.method in ["POST", "PUT"]:
        data = request.form
        name = data['name'].strip()
        slug = data['slug'].strip()
        filedata = data['filedata'].strip()

        storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chartbuilder-storage')
        path = os.path.join(storage_dir, slug)

        # Make the path if it doesn't exist, but it almost always should
        if not os.path.exists(path):
            os.makedirs(path)

        filepath = os.path.join(path, name)

        # Trim base64 prefix from encoded file
        filepos = filedata.find("base64,", 0, 50)
        if filepos > -1:
            filedata = filedata[filepos + len("base64,"):]

        # Decode base64 string
        filedata_decoded = base64.decodestring(urllib.unquote(filedata))

        # Write the file
        with open(filepath, 'wb') as file:
            file.write(filedata_decoded)

    return "Chart saved to drive"


@app.route('/delete/', methods=['GET'])
@crossdomain(origin="*")
def delete():
    slug = request.args.get('slug')
    storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chartbuilder-storage')
    path = os.path.join(storage_dir, slug)

    try:
        conn = get_p2p_connection()
        conn.delete_content_item(slug)
    except p2p.P2PNotFound:
        pass

    if os.path.exists(path):
        shutil.rmtree(path)
        return "Chart deleted %s" % slug

    else:
        return "Slug does not exist %s" % slug


if __name__ == '__main__':
    app.run(debug=True)
