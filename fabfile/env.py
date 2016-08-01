import os
from fabric.api import env, task
from os.path import expanduser

try:
    from app.secrets import settings_local as settings
except ImportError:
    from app.secrets import settings_default as settings

env.branch = "master"
env.hosts = (settings.STOCKSERVER_HOST,)
env.user = settings.STOCKSERVER_USER
env.password = settings.STOCKSERVER_PASS
env.project_dir = "/Library/WebServer/Documents/chartbuilder-lat-dev/repo"
env.activate = "source /Library/WebServer/Documents/chartbuilder-lat-dev/bin/activate"

@task
def prod():
    env.project_dir = "/Library/WebServer/Documents/chartbuilder-lat/repo"
    env.activate = "source /Library/WebServer/Documents/chartbuilder-lat/bin/activate"
