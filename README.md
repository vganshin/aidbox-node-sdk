# Aidbox NodeJS SDK

[![Build Status](https://travis-ci.org/Aidbox/aidbox-node-sdk.svg?branch=master)](https://travis-ci.org/Aidbox/aidbox-node-sdk)

[![npm version](https://badge.fury.io/js/aidbox.svg)](https://badge.fury.io/js/aidbox)

[Docs](https://docs.aidbox.app/aidbox-sdk/aidbox-apps)

## Launch example
* go to example directorie  ```cd example/```
* install dependencies ```npm install```
* copy environment  template file ```cp .env-tpl .env```
* open ```.env``` and fill Aidbox license credentials
* import environment variables ```source .env```
* run local container network ```docker-compose up``` and wait when all started
* go to http://localhost:8080/index.html#/signin and submit Aidbox client credentials (see it in .env file)
* add "open" ```AccessPolicy``` in ```Access Control``` section in YAML-format - ```
engine: allow
resourceType: AccessPolicy
```
* open "http://localhost:8080/_report" and obtain result of example app - count of ```Attribute``` resource

To build your own App with NodeJs see [docs](https://docs.aidbox.app/aidbox-sdk/nodejs)

## Launch tests

* Up network with Devbox and db ```npm run docker-compose```
* Build image with SDK application ```npm run docker-build```
* Run tests inside container ```npm run docker-run```


Powered by [Health Samurai](http://www.health-samurai.io) | [Aidbox](http://www.health-samurai.io/aidbox) | [Fhirbase](http://www.health-samurai.io/fhirbase)
