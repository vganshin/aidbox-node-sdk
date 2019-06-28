# Aidbox NodeJS SDK

[![Build Status](https://travis-ci.org/Aidbox/aidbox-node-sdk.svg?branch=master)](https://travis-ci.org/Aidbox/aidbox-node-sdk) [![npm version](https://badge.fury.io/js/aidbox.svg)](https://badge.fury.io/js/aidbox) [![codecov](https://codecov.io/gh/Aidbox/example/branch/master/graph/badge.svg)](https://codecov.io/gh/Aidbox/example)

[Docs](https://docs.aidbox.app/aidbox-sdk/aidbox-apps)

## Install
```
npm install aidbox
```

## Launch example
* go to example directorie  ```cd example/```
* install dependencies ```npm install```
* copy environment  template file ```cp .env-tpl .env```
* open ```.env``` and fill Aidbox license credentials
* import environment variables ```source .env```
* run local container network ```docker-compose up``` and wait when all started
* open http://localhost:8080/_report and obtain result of example app - count of ```Attribute``` resource

To build your own App with NodeJs see [docs](https://docs.aidbox.app/aidbox-sdk/nodejs)

## Launch tests

* Install dependencies ```npm install```
* Up network with Devbox and db ```npm run test:compose```
* Run tests inside container ```npm run test```


Powered by [Health Samurai](http://www.health-samurai.io) | [Aidbox](http://www.health-samurai.io/aidbox) | [Fhirbase](http://www.health-samurai.io/fhirbase)
