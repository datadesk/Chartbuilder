from fabric.api import task, sudo


@task
def restartapache():
    """
    Restarts Apache on stockserver
    """
    sudo("apachectl -e debug -k restart")
