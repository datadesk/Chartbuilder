import os
from fabric.api import local, task, settings, put, env

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings


env.hosts = (settings.STOCKSERVER_HOST,)
env.user = settings.STOCKSERVER_USER
env.password = settings.STOCKSERVER_PASS
env.project_dir = "/Library/WebServer/Documents/chartbuilder-lat-dev"

def copy_secrets():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_dir = os.path.join(base_dir, 'secrets')
    put(source_dir, env.project_dir)
