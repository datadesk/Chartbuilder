#!/usr/bin/env python
# -*- coding: utf-8 -*-
import p2p
# import log
from flask import Flask

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


@app.route('/')
def hello_world():
    app.logger.debug("Accessing index page!")
    return 'Hello, world! Today'

@app.route('/user/<username>')
def show_user_profile(username):
    # Show the profile for that user
    return "User %s" % username

@app.route('/send-to-p2p/')
def send_to_p2p():
    return "Hello, world!"


if __name__ == '__main__':
    app.run(debug=True)
