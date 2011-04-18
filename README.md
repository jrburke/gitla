


Got to https://github.com/account/applications/new

Name: gitla: Git/Bugzilla Workflow App
URL: http://127.0.0.1:44852/
Callback URL: http://127.0.0.1:44852/oauthDone

Put the info in a gitla.json file that is in this directory...


The examples below use **develop** as the target branch names for bug branch
merges, but any valid branch name can be used instead.

## Create a bug branch

    gitla.js branch 12345 develop

This will create a branch named bug/12345 from the develop branch.

No Bugzilla or GitHub work is done as part of this command. It just enforces the
bug/12345 pattern for branch names.

## Ask for a review

    gitla.js r?:jrburke "message" develop

Asks jrburke for a review of the current branch by creating a pull request against **develop**,
then creating a bug attachment for that pull request in the bug with the same number
as the current branch (current branch must have the pattern of bug/12345).

The "message" will show up in the GitHub pull request and in the Bugzilla attachment.

## Merge a bug branch

    gitla.js merge "r=jrburke" develop (uses current branch name to merge into develop)

Merges the current branch (which must have pattern bug/12345) into **develop**, using the message "r=jrburke".

This command will do a --no-ff merge with a commit message follows the form:

    "Bug 12345 - Title of Bugzilla bug. " + "message"

Once the merge is complete:

* the resulting merge to "develop" is pushed to "origin"
* the Bugzilla bug is marked closed/resolved with a "Fixed in https:/github.com/commit/changeset/url".

GitHub will automatically close the pull request, so no work is done as part of this command.

## Delete a bug branch

    gitla.js delete 12345

Deletes the bug/12345 branch. Removes the local and remote branches.
