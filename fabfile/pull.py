from fabric.api import cd, task, env, run
from venv import _venv


@task
def pull():
    """
    Pulls the latest code using Git
    """
    env.shell = "/bin/bash -c"
    with cd(env.project_dir):
        run("git pull origin %s" % env.branch)