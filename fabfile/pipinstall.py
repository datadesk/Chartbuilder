from fabric.api import task
from venv import _venv


@task
def pipinstall(package=''):
    """
    Install Python requirements inside a virtualenv.
    """
    if not package:
        _venv("pip install -r repo/requirements.txt")
    else:
        _venv("pip install %s" % package)
