import os
from fabric.api import task, cd, local

@task
def clean():
    """
    Erases pyc files from our app code directory.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with cd(base_dir):
        local("find . -name '*.pyc' -print0|xargs -0 rm")
