#!/bin/bash
#monofuel
#3-2016

echo "running update"

#pull latest changes
git pull origin master

#rebuild things
make
