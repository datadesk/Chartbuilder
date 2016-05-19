import os
import shutil
from fabric.api import local, task, settings, put, env

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings


env.hosts = ("%s@%s", settings.STOCKSERVER_USER, settings.STOCKSERVER_URL)
env.user = settings.STOCKSERVER_USER
env.password = settings.STOCKSERVER_PASS

@task
def deploy(silent=False):
    """
    Deploys the latest code to a remote server.
    """
    # Run node build command
    # local("npm run build")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build_dir = os.path.join(base_dir, 'build')
    remote_dir = os.path.join(settings.STOCKSERVER_URL, 'chartbuilder-lat-dev')

    # Copy to new directory
    # shutil.copytree(os.path.join(base_dir, 'build'), build_dir)
    put(build_dir, remote_dir)

    # for infile in os.walk(os.path.join(base_dir, 'build')):
    #     print infile
    # Copy secrets file to stockserver
