import os
from fabric.api import env, task
from os.path import expanduser

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings

env.hosts = (settings.STOCKSERVER_HOST,)
env.user = settings.STOCKSERVER_USER
env.password = settings.STOCKSERVER_PASS
env.project_dir = "/Library/WebServer/Documents/chartbuilder-lat-dev"
env.activate = "source %s/bin/activate" % env.project_dir
