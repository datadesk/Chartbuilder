from fabric.api import local, task, settings


@task
def serve():
    """
    Fire up the local development server
    """
    with settings(warn_only=True):
        local("rm ./app/*.pyc")
    local("python app/chartbuilder_server.py")
