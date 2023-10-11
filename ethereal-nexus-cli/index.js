#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import {publishCommand} from './src/commands/PublishCommand.js'


yargs(hideBin(process.argv))
    .command('publish', 'Publish the components',  () => {}, publishCommand)
    .demandCommand(1)
    .parse();
