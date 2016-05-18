import os
from fabric.api import task, cd, sudo

@task
def clean():
    """
    Erases pyc files from our app code directory.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with cd(base_dir):
        sudo("find . -name '*.pyc' -print0|xargs -0 rm", pty=True)
