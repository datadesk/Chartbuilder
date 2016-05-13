#!/usr/bin/env python
# -*- coding: utf-8 -*-
import p2p
# import log
from flask import Flask
from flask import jsonify
from flask import json
from flask import request

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings

app = Flask(__name__)


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


def prep_p2p_blurb_payload(slug):
    """
    Accepts a data dictionary POSTed by the chartbuilder interface and transforms
    it into the data structure expected by P2P's API.
    """
    # start things off
    payload = {
        'slug': data['slug'] + "-chartbuilder",
        'title': data['title'],
        'content-item-type-code': 'blurb',
        'content_item_state_code': 'working'
    }

    # We're going to have a base64 encoded SVG,
    # so I imagine we'll have to do this differently
    context = {
        'elements_json': json.dumps(data['elements'])
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
        conn.create_content_item(payload)
        created = True

    # return the created bool with the updated object
    return created, get_object_or_none(slug)


@app.route('/')
def hello_world():
    app.logger.debug("Accessing index page!")
    return 'Hello, world! Today'


@app.route('/send-to-p2p/')
def send_to_p2p():
    """
    Saves the SVG of a chart as a blurb in P2P
    """
    app.logger.debug("sending to P2P")

    # We should be POSTing
    if request.method in ["POST", "PUT"]:
        # Pull the data from the latest POST request
        data = json.loads(request.data)

        # Make a generic response object
        r = {}

        try:
            created, obj = api.update_or_create_chartblurb(data)
            content = {
                "message": "Updated in P2P",
                "created": created,
                "p2p_blurb": obj,
            }
        except Exception as e:
            # Return the exception if it fails
            content = {"message": str(e)}
            r = jsonify(content)
            r.status_code = 500
            return r

    return "Sending to p2p!"




if __name__ == '__main__':
    app.run(debug=True)
