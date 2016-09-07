/*
   Copyright 2016 Opto 22

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import * as ApiLib from "./api";
import MessageQueue from "./message-queue";

import http = require('http');
import https = require('https');
import fs = require('fs');
import events = require('events');
import request = require('request');

var ControllerApi = ApiLib.AllApi;

// The TypeScript client generated with swagger-codegen does not allow us to add our own
// options to the Request library. However, there is an empty and useless default 
// authentication field which we can override and use it as a general extension point.
class RequestOptionsModifier
{
    constructor(private publicCertFile: Buffer, private caCertFile: Buffer, private agent: https.Agent, private https: boolean)
    {

    }

    applyToRequest(requestOptions: request.Options): void
    {
        if (this.https) {
            // Add the required options. Wish there was a more official way to do this.
            // An alternative is to customize the template used by the swagger-codegen tool.
            // This is good enough for now.

            if (this.publicCertFile) {
                requestOptions.cert = this.publicCertFile;
            }

            if (this.caCertFile) {
                requestOptions.ca = this.caCertFile;
            }

            requestOptions.port = 443;
        }
        else {
            requestOptions.port = 80;
        }

        requestOptions.forever = true;
        requestOptions.agent = this.agent;
    }
}


export class ControllerApiEx extends ControllerApi
{
    private apiKeyId: string;
    private apiKeyValue: string;
    private https: boolean;
    private publicCertFile: Buffer;
    private caCertFile: Buffer;
    private httpAgent: http.Agent; // TODO: do we need to keep this around?
    private event: events.EventEmitter;
    private configError: boolean;

    constructor(username: string, password: string, basePath: string, https: boolean,
        publicCertFile: Buffer, caCertFile: Buffer)
    {
        super(username, password, basePath);
        this.apiKeyId = username;
        this.apiKeyValue = password;
        this.https = https;
        this.publicCertFile = publicCertFile;
        this.caCertFile = caCertFile;

        this.replaceDefaultAuthWithCustomRequestOptions();
    }

    // The TypeScript client generated with swagger-codegen does not allow us to add our own
    // options to the Request library. However, there is an empty and useless default 
    // authentication field which we can override and use it as a general extension point.
    private replaceDefaultAuthWithCustomRequestOptions()
    {
        if (this.https) {

            var httpsAgent = new https.Agent({
                keepAlive: true,
                maxSockets: 1 // might not be needed anymore, since we now use MessageQueue.
            });

            // Cast from the HTTPS to the HTTP agent. The node.d.ts typing file doesn't define
            // https.Agent as being derived from http.Agent.
            this.httpAgent = <http.Agent>httpsAgent;

            // Replace the default authentication handler.
            this.authentications.default = new RequestOptionsModifier(this.publicCertFile, this.caCertFile,
                httpsAgent, this.https);
        }
        else {
            var httpAgent = new http.Agent(
                {
                    keepAlive: true,
                    maxSockets: 1 // might not be needed anymore, since we now use MessageQueue.
                });

            this.httpAgent = httpAgent;

            // Replace the default authentication handler.
            this.authentications.default = new RequestOptionsModifier(null, null, httpAgent, this.https);
        }
    }

    public hasConfigError(): boolean
    {
        if (this.configError === undefined) {

            // Check for bad API keys
            if (!(this.apiKeyId && this.apiKeyValue)) {
                this.configError = true; // Bad API key ID or Value
            }
            else if (this.https === true) {
                // Make sure we have at least a CA certificate file, which also covers self-signed certs.
                if (!this.caCertFile) {
                    this.configError = true;
                }
            }
            else {
                this.configError = false;
            }
        }

        return this.configError;
    }

}