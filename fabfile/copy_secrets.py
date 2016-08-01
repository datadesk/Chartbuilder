import os
from fabric.api import task, put, env


@task
def copy_secrets():
    """
    Copies our settings file onto a remote server
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    secrets_dir = os.path.join(base_dir, 'app', 'secrets')
    remote_dir = os.path.join(env.project_dir, 'app',)

    put(secrets_dir, remote_dir)