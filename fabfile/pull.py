from fabric.api import task, env
from venv import _venv


@task
def pull():
    """
    Pulls the latest code using Git
    """
    _venv("git pull origin %s" % env.branch)