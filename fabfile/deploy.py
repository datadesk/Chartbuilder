import os
import shutil
from fabric.api import local, task, settings, put

env.hosts = ("IP address goes here",)
env.user = 'artist'


@task
def deploy(silent=False):
    """
    Deploys the latest code to a remote server.
    """
    # Run node build command
    # local("npm run build")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build_dir = os.path.join(base_dir, 'build_test')

    # Remove build dir
    try:
        shutil.rmtree(build_dir)
    except Exception:
        pass
       
    # Copy to new directory
    # shutil.copytree(os.path.join(base_dir, 'build'), build_dir)
    # put(os.path.join(base_dir, 'build'), build_dir)

    # for infile in os.walk(os.path.join(base_dir, 'build')):
    #     print infile
    # Copy secrets file to stockserver
