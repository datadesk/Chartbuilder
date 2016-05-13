#!/usr/bin/env python
# -*- coding: utf-8 -*-
import p2p
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    app.logger.debug("Accessing index page!")
    return 'Hello, world! Today'

@app.route('/user/<username>')
def show_user_profile(username):
    # Show the profile for that user
    return "User %s" % username


if __name__ == '__main__':
    app.run(debug=True)
