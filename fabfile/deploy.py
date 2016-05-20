import os
from .clean import clean
from .copy_secrets import copy_secrets
from .pipinstall import pipinstall
from .pull import pull
from .restartapache import restartapache
from .venv import _venv
from fabric.api import local, task, settings, run


@task
def deploy(silent=False):
    """
    Deploys the latest code to a remote server.
    """
    local("npm run build")

    with settings(warn_only=True):
        local("git commit -am 'updating build'")
        local("git push origin master")

    # cleanup first
    clean()
    pull()

    # Copy secrets file
    copy_secrets()

    # install requirements
    pipinstall()
    restartapache()

