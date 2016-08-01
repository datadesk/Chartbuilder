import os
from fabric.api import sudo, task, cd, env

@task
def clean():
    """
    Erases pyc files from our app code directory.
    """
    env.shell = "/bin/bash -c"
    with cd(env.project_dir):
        sudo("find . -name '*.pyc' -print0|xargs -0 rm")
