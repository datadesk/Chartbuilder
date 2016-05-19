from fabric.api import sudo, cd, env


def _venv(cmd):
    """
    Runs the provided command in a remote virtualenv
    """
    with cd(env.project_dir):
        sudo("%s && %s" % (env.activate, cmd))