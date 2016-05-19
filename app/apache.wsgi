"""
apache.wsgi


Configuration for Apache that will connect its mod_wsgi module with our application
via a VirtualHost.
"""
import os
import sys

# Add the app directory and python site-packages to the Apache PATH
BASE_DIR = os.path.dirname(os.path.realpath(__file__))
SITE_PACKAGES = os.path.join(
    BASE_DIR,
    os.path.pardir,
    os.path.pardir,
    'local/lib/python2.7/site-packages/'
)

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, SITE_PACKAGES)