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

import * as NodeHandlers from "../../node-handlers";
import * as ConfigHandler from "../../config-handler";
import * as MockNode from "../node-red/MockNode";
import * as MockRed from "../node-red/MockRed";

var TestSettings = require('./settings.json');

import should = require('should');
import assert = require('assert');
import NodeRed = require('node-red');


class MockPacReadNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-read', onSend, onError);
    }
}

class MockPacWriteNode extends MockNode.MockNode
{
    constructor(onSend: (msg: any) => void, onError?: (errorText: any, nodeMessage: any) => void)
    {
        super('pac-write', onSend, onError);
    }
}



describe('SNAP PAC Nodes', function()
{
    // Create a "pac-device" device configuration.
    var deviceConfig = createDeviceConfig('deviceId0', TestSettings.pacAddress,
        TestSettings.pacKeyId, TestSettings.pacKeyValue);


    before(function()
    {
        ConfigHandler.controllerConnections.createControllerConnection(deviceConfig.address,
            false, deviceConfig.credentials.key, deviceConfig.credentials.secret, '', '',
            deviceConfig.id);

        should.exist(ConfigHandler.controllerConnections.getController(deviceConfig.id));

        var RED = new MockRed.MockRed();

        NodeHandlers.setRED(RED);
        ConfigHandler.setRED(RED);
    });

    function createDeviceConfig(deviceId: string, address: string, key: string,
        secret: string): ConfigHandler.DeviceConfiguration
    {
        var deviceConfig: ConfigHandler.DeviceConfiguration = {
            id: deviceId,
            address: address,
            credentials:
            {
                key: key,
                secret: secret,
                publicCertPath: '',
                caCertPath: '',
            }

        };
        return deviceConfig;
    }

    function injectTimestampMsg(nodeConfig, deviceConfig, node)
    {
        injectMsg(nodeConfig, deviceConfig, node, { "payload": 1466009468654 });
    }

    function injectMsg(nodeConfig, deviceConfig, node, msg)
    {
        // Create the node's worker implementation.
        var nodeHandlerImpl: NodeHandlers.PacNodeBaseImpl;
        if (nodeConfig.type === 'pac-read') {
            nodeHandlerImpl = new NodeHandlers.PacReadNodeImpl(nodeConfig, deviceConfig, node);
        }
        else if (nodeConfig.type === 'pac-write') {
            nodeHandlerImpl = new NodeHandlers.PacWriteNodeImpl(nodeConfig, deviceConfig, node);
        }

        // Send it a basic message, like an Inject Timestamp node does.
        nodeHandlerImpl.addMsg(msg);
    }

    function testReadNode(deviceId: string, dataType: string, tagName: string,
        responseCallback: (msg: any) => void, msg?: any): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-read",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacReadNode(responseCallback);

        if (msg !== undefined) {
            injectMsg(nodeConfig, deviceConfig, node, msg);
        }
        else {
            injectTimestampMsg(nodeConfig, deviceConfig, node);
        }
    }

    function testWriteNode(deviceId: string, dataType: string, tagName: string, valueType: string,
        valueProperty, msg: any, responseCallback: (msg: any) => void): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-write",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "valueType": valueType,
            "value": valueProperty,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacWriteNode(responseCallback);

        injectMsg(nodeConfig, deviceConfig, node, msg);
    }

    function testReadNodeError(deviceId: string, dataType: string, tagName: string,
        done: () => any, errorCallback: (errorText: any, nodeMessage: any) => void): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-read",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacReadNode(null, errorCallback);

        injectTimestampMsg(nodeConfig, deviceConfig, node);
    }

    function testWriteNodeError(deviceId: string, dataType: string, tagName: string,
        valueType: string, valueProperty, msg: any,
        errorCallback: (errorText: any, nodeMessage: any) => void): any
    {
        // Create a node's configuration.
        var nodeConfig = {
            "id": "930e8d11.9abbf", // This is just an example ID. Nothing special about it.
            "type": "pac-write",
            "device": deviceId,
            "dataType": dataType,
            "tagName": tagName,
            "valueType": valueType,
            "value": valueProperty,
            "tableStartIndex": "",
            "tableLength": "",
            "name": "",
        };

        // Create a mock node, which checks the response from the controller.
        var node = new MockPacWriteNode(null, errorCallback);

        injectMsg(nodeConfig, deviceConfig, node, msg);
    }

    it('#readDeviceInfo', function(done)
    {
        testReadNode(deviceConfig.id, 'device-info', '',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.payload);
                should.exist(msg.payload.controllerType);
                should.exist(msg.payload.firmwareVersion);
                should.exist(msg.payload.firmwareDate);
                should.exist(msg.payload.firmwareTime);
                should.exist(msg.payload.upTimeSeconds);
                should(msg.payload.upTimeSeconds).be.greaterThan(0);

                done(); // Tell Mocha that we're done.
            });
    });

    it('#readStrategyInfo', function(done)
    {
        testReadNode(deviceConfig.id, 'strategy-info', '',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.payload);
                should.exist(msg.payload.strategyName);
                should.exist(msg.payload.date);
                should.exist(msg.payload.time);
                should.exist(msg.payload.crc);
                should.exist(msg.payload.runningCharts);

                done();// Tell Mocha that we're done.
            });
    });

    it('#readVariable', function(done)
    {
        assertRead(deviceConfig.id, 'int32-variable', 'nAlways123', 123, done);
    });


    it('#readVariableFromDynamicMsgProperty', function(done)
    {
        var msg = {
            payload: {
                tagName: 'nAlways1'
            }
        };

        testReadNode(deviceConfig.id, 'int32-variable', 'nAlways1230',
            (msg: any) =>
            {
                // Do the actual checks here.
                should.exist(msg.payload);
                should(msg.payload).be.type('number');
                should.exist(msg.body.value);
                should(msg.payload).equal(1);
                should(msg.payload).equal(msg.body.value);

                done(); // Tell Mocha that we're done.
            }, msg);
    });

    function delayed(done)
    {
        // Intentionally delay so that the TCP reset from the controller will not cause problems
        // in the next request.
        setTimeout(() =>
        {
            done(); // Tell Mocha that we're done.
        }, 100);
    }

    it('#readVariableMissing',
        function(done)
        {
            testReadNodeError(deviceConfig.id, 'int32-variable', 'tag not here', done,
                (errorText: any, msg: any) =>
                {
                    //console.log('msg = ' + JSON.stringify(msg));

                    // Do the actual checks here.
                    should.exist(msg.payload);
                    should.exist(msg.pacError.statusCode);
                    should.exist(msg.pacError.body.errorCode);
                    should(msg.pacError.statusCode).equal(404);
                    should(msg.pacError.body.errorCode).equal(-28);

                    delayed(done);
                });
        });

    it('#writeVariableMissing', function(done)
    {
        testReadNodeError(deviceConfig.id, 'int32-variable', 'tag not here', done,
            (errorText: any, msg: any) =>
            {
                //console.log('msg = ' + JSON.stringify(msg));

                // Do the actual checks here.
                should.exist(msg.payload);
                should.exist(msg.pacError.statusCode);
                should.exist(msg.pacError.body.errorCode);
                should(msg.pacError.statusCode).equal(404);
                should(msg.pacError.body.errorCode).equal(-28);

                delayed(done);
            });
    });

    function assertRead(deviceConfigId: string, tagDataType: string, tagName: string,
        value: any, done: () => any)
    {
        testReadNode(deviceConfig.id, tagDataType, tagName, (msg: any) =>
        {
            should(msg.payload).equal(value);
            should(msg.body.value).equal(value);
            done(); // Tell Mocha that we're done.
        });
    }

    function assertWrite(deviceConfigId: string, tagDataType: string, tagName: string,
        valueType: string, valueProperty, valueObj: any, value: any, done: () => any)
    {
        testWriteNode(deviceConfigId, tagDataType, tagName, valueType, valueProperty, valueObj,
            (msg: any) =>
            {
                should(msg.body.errorCode).equal(0);

                // Do a Read to vefify the Write.
                assertRead(deviceConfig.id, tagDataType, tagName, value, done);
            });

    }

    it('#writeInt32VarFromMsgPayloadNumber', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: 22 }, 22, done);
    });

    it('#writeInt32VarFromMsgPayloadString', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '',
            { payload: '33' }, 33, done);
    });

    it('#writeInt32VarFromMsgPayloadBoolean', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg.payload', '', { payload: true },
            1, done);
    });

    it('#writeStringVarFromMsgPayloadNumber', function(done)
    {
        assertWrite(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '', { payload: 22 },
            '22', done);
    });

    it('#writeStringVarFromMsgPayloadString', function(done)
    {
        assertWrite(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '',
            { payload: 'abc XYZ' }, 'abc XYZ', done);
    });

    it('#writeStringVarFromMsgPayloadBoolean', function(done)
    {
        assertWrite(deviceConfig.id, 'string-variable', 's5', 'msg.payload', '',
            { payload: true }, 'true', done);
    });

    it('#writeVariableFromMsgProperty', function(done)
    {
        var msg = { 'value': { 'whatever': 99 } };
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'msg', 'value.whatever', msg,
            99, done);
    });

    it('#writeVariableFromUiValue', function(done)
    {
        assertWrite(deviceConfig.id, 'int32-variable', 'n1', 'value', '88', {}, 88, done);
    });

});
