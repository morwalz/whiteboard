/* Global State */
var
    serverName = 'http://localhost:4792',
    chatServer = initChatServerAdapter(serverName),

    brush = initBrushModel({
        type:'pen',
        color:{r:0, g:0, b:0},
        fill:{r:255, g:255, b:255},
        size:3,
        opacity:1
    }),
    chat = initChatModel(),
    canvas = initCanvasModel(),

    brushController = initBrushController(),
    chatController = initChatController(),
    canvasController = initCanvasController()
;

/* Models */
function initChatServerAdapter(serverName) {
    var
        server = io.connect(serverName + '/chat'),
        receiveCallbacks = []
    ;

    function callReceiveCallbacks(sender, message) {
        for (
            var
                funcNo = -1,
                numFuncs = receiveCallbacks.length
            ;
            ++funcNo < numFuncs;
        )
            receiveCallbacks[funcNo](sender, message)
    }

    server.on('receive', function(message) {
        var
            sanitizedSender = $('<div />').text(message.sender).html(),
            sanitizedMessage = $('<div />').text(message.message).html()
        ;
        callReceiveCallbacks(sanitizedSender, sanitizedMessage);
    });

    return {
        setName:function(name) {server.emit('setName', name)},
        send:function(message) {server.emit('send', message)},
        onreceive:function(callback) {receiveCallbacks.push(callback)}
    }
}

function initBrushModel(properties) {
    var
        toolProperties = {
            pen:{color:1, size:1},
            eraser:{size:1},
            rectangle:{color:1, fill:1, size:1, opacity:1}
        },

        type = properties.type,
        typeChangeCallbacks = [],
        color = properties.color,
        colorChangeCallbacks = [],
        fill = properties.fill,
        fillChangeCallbacks = [],
        size = properties.size,
        sizeChangeCallbacks = [],
        opacity = properties.opacity,
        opacityChangeCallbacks = []
    ;

    function getProperties() {
        var
            validPropertyLookup = toolProperties[type],
            properties = {type:type}
        ;
        if (validPropertyLookup.color && color)
            properties.color = color;
        if (validPropertyLookup.fill && fill)
            properties.fill = fill;
        if (validPropertyLookup.size && size)
            properties.size = size;
        if (validPropertyLookup.opacity && opacity)
            properties.opacity = opacity;
        return properties;
    }

    function getProperty(name) {
        return getProperties()[name];
    }

    function runFunctions(functions) {
        for (var funcNo = -1, numFuncs = functions.length; ++funcNo < numFuncs;)
            functions[funcNo]();
    }

    function setProperties(properties) {
        if (properties.type) {
            type = properties.type;
            runFunctions(typeChangeCallbacks);
        }

        var validPropertyLookup = toolProperties[type];
        if (validPropertyLookup.color && properties.color) {
            color = properties.color;
            runFunctions(colorChangeCallbacks);
        }
        if (validPropertyLookup.fill && properties.fill) {
            fill = properties.fill;
            runFunctions(fillChangeCallbacks);
        }
        if (validPropertyLookup.size && properties.size) {
            size = properties.size;
            runFunctions(sizeChangeCallbacks);
        }
        if (validPropertyLookup.opacity && properties.opacity) {
            opacity = properties.opacity;
            runFunctions(opacityChangeCallbacks);
        }
    }

    function setProperty(name, value) {
        var properties = {};
        properties[name] = value;
        setProperties(properties);
    }

    return {
        get:function (name) {
            return name ? getProperty(name) : getProperties()
        },
        getValidProperties:function () {
            return toolProperties[type]
        },
        set:function (x, y) {
            typeof x == 'object' ? setProperties(x) : setProperty(x, y)
        },
        onchange:function(property, callback) {
            if (property == 'type')
                typeChangeCallbacks.push(callback);
            if (property == 'color')
                colorChangeCallbacks.push(callback);
            if (property == 'fill')
                fillChangeCallbacks.push(callback);
            if (property == 'size')
                sizeChangeCallbacks.push(callback);
            if (property == 'opacity')
                opacityChangeCallbacks.push(callback);
        }
    };
}

function initChatModel() {
    var
        name,
        messages = [{
            sender:'Server',
            message:'Welcome to Whiteboard, a shared drawing surface ' +
                'supporting multiple simultaneous users.'
        }],
        messageAddCallbacks = []
    ;

    function getMessages() {
        return messages;
    }

    function getName() {
        return name;
    }

    function setName(newName) {
        name = newName;
        chatServer.setName(name);
    }

    function receive(sender, message) {
        messages.push({
            sender:sender,
            message:message
        });
        for (
            var
                funcNo = -1,
                numFuncs = messageAddCallbacks.length
            ;
            ++funcNo < numFuncs;
            )
            messageAddCallbacks[funcNo]();
    }

    function send(message) {
        if (name) {
            receive(name, message);
            chatServer.send(message);
        }
    }

    function onadd(callback) {
        messageAddCallbacks.push(callback);
    }

    chatServer.onreceive(receive);

    return {
        getName:getName,
        setName:setName,
        getMessages:getMessages,
        receive:receive,
        send:send,
        onadd:onadd
    }
}

function initCanvasModel() {
    var
        commands = [],
        commandAddCallbacks = []
    ;

    function addCommand(command) {
        commands.push(command);
        for (
            var
                funcNo = -1,
                numFuncs = commandAddCallbacks.length
            ;
            ++funcNo < numFuncs;
        )
            commandAddCallbacks[funcNo]();
    }

    return {
        getCommands:function() {return commands},
        addCommand:addCommand,
        onadd:function (callback) {commandAddCallbacks.push(callback)}
    }
}

/* Controllers */
function initBrushController() {
    var
        colorPicker,
        fillPicker,
        sizePicker,
        sizeValue,
        opacityPicker,
        opacityValue,
        toolPicker,

        enableToolChangeEvent = true
    ;

    function initUi() {
        colorPicker = $('#color');
        fillPicker = $('#fill');
        sizePicker = $('#size');
        sizeValue = $('#sizeValue');
        opacityPicker = $('#opacity');
        opacityValue = $('#opacityValue');
        toolPicker = $('#tools');

        colorPicker.miniColors({
            change:function(hex, rgb) {
                brush.set('color', rgb)
            }
        });

        fillPicker.miniColors({
            change:function(hex, rgb) {
                brush.set('fill', rgb)
            }
        });

        sizePicker.slider({
            range:'min',
            min:1,
            max:50,
            slide:function(event, ui) {
                var size = ui.value;
                brush.set('size', size);
                sizeValue.text(size + 'px');
            }
        });

        opacityPicker.slider({
            range:'min',
            min:0,
            max:1,
            step:0.01,
            slide:function(event, ui) {
                var opacity = ui.value;
                brush.set('opacity', opacity);
                opacityValue.text(Math.round(opacity * 100) + '%');
            }
        });

        toolPicker.buttonset();
        toolPicker.change(function() {
            enableToolChangeEvent &&
                brush.set('type', $('#tools input[name=tools]:checked').attr('id'))
        });
    }

    function updateUi() {
        updateColor();
        updateFill();
        updateSize();
        updateOpacity();
        updateTool();
    }

    function updateColor() {
        var color = brush.get('color');
        color && colorPicker.miniColors(
            'value',
            '#' + color.r.toString(16) + color.g.toString(16) +
                color.b.toString(16)
        );
    }

    function updateFill() {
        var fill = brush.get('fill');
        fill && fillPicker.miniColors(
            'value',
            '#' + fill.r.toString(16) + fill.g.toString(16) +
                fill.b.toString(16)
        );
    }

    function updateSize() {
        var size = brush.get('size');
        if (size) {
            sizePicker.slider('option', 'value', size);
            sizeValue.text(size + 'px');
        }
    }

    function updateOpacity() {
        var opacity = brush.get('opacity');
        if (opacity) {
            opacityPicker.slider('option', 'value', opacity);
            opacityValue.text(Math.round(opacity * 100) + '%');
        }
    }

    function updateTool() {
        enableToolChangeEvent = false;
        $('#tools input[id=' + brush.get('type') + ']').attr('checked', 'checked');
        $('#tools').buttonset('refresh');
        enableToolChangeEvent = true;

        var validProperties = brush.getValidProperties();
        validProperties.color ? colorPicker.parent().show() : colorPicker.parent().hide();
        validProperties.fill ? fillPicker.parent().show() : fillPicker.parent().hide();
        validProperties.size ? sizePicker.parent().show() : sizePicker.parent().hide();
        validProperties.opacity ? opacityPicker.parent().show() : opacityPicker.parent().hide();
        updateOpacity();
    }

    brush.onchange('color', updateColor);
    brush.onchange('fill', updateFill);
    brush.onchange('size', updateSize);
    brush.onchange('opacity', updateOpacity);
    brush.onchange('type', updateTool);

    $(document).ready(initUi);
    $(document).ready(updateUi);

    return {
        initUi:initUi,
        updateUi:updateUi,
        updateColor:updateColor,
        updateSize:updateSize,
        updateOpacity:updateOpacity,
        updateTool:updateTool
    };
}

function initChatController() {
    var
        history,
        input,
        button,
        signInDialog,
        nameInput
    ;

    function initUi() {
        history = $('#chatHistory');
        input = $('#chatText');
        button = $('#chatSubmit');
        signInDialog = $('#signInDialog');
        nameInput = $('#name');

        function signIn() {
            chat.setName(nameInput.val());
            signInDialog.dialog('close');
        }
        signInDialog.dialog({
            modal:true,
            width:280,
            buttons:{
                'Sign In':signIn
            }
        });
        nameInput.keydown(function(event) {
            if (event.which == 13)
                signIn()
        });

        function sendMessage() {
            chat.send(input.val());
            input.val('');
            input.focus();
        }

        button.button();
        button.click(sendMessage);

        input.keydown(function(event) {
            if (event.which == 13)
                sendMessage()
        });
    }

    function updateUi() {
        var messages = chat.getMessages();
        if (messages && messages.length) {
            var message = messages[messages.length - 1];
            if (message.sender == 'Server') {
                history.prepend('<li class="system"><p>' + message.message +
                    '</p></li>');
            } else {
                history.prepend('<li><h2>' + message.sender + '</h2><p>' +
                    message.message + '</p></li>');
            }
        }
    }

    chat.onadd(updateUi);

    $(document).ready(initUi);
    $(document).ready(updateUi);

    return {
        initUi:initUi,
        updateUi:updateUi
    };
}

function initCanvasController() {
    var
        container,
        clearButton,

        context,
        previewContext,
        startPoint
    ;

    function executeCommand(command) {
        switch(command.name) {
            case 'drawPath':
                drawPath(command.points, command.brushProperties);
                break;
            case 'drawRectangle':
                drawRectangle(command.dimensions, command.brushProperties);
                break;
            case 'clear':
                clear();
                break;
        }
    }

    function drawPath(points, brushProperties) {
        var color = brushProperties.color;
        if (brushProperties.type == 'pen') {
            context.globalCompositeOperation = 'source-over';
            context.strokeStyle = 'rgb(' + color.r + ',' + color.g + ',' +
                color.b + ')';
        } else { // brushProperties.type == 'eraser'
            context.globalCompositeOperation = 'copy';
            context.strokeStyle = 'rgba(0,0,0,0)';
        }
        context.lineWidth = brushProperties.size;
        context.beginPath();
        var curPt = points[0];
        context.moveTo(curPt.x, curPt.y);
        for (var ptNum = 0, numPts = points.length; ++ptNum < numPts;) {
            curPt = points[ptNum];
            context.lineTo(curPt.x, curPt.y);
        }
        context.closePath();
        context.stroke();
    }

    function previewRectangle(dimensions, brushProperties) {
        var
            x = dimensions.x,
            y = dimensions.y,
            w = dimensions.width,
            h = dimensions.height,
            size = brushProperties.size,
            color = brushProperties.color,
            fill = brushProperties.fill
        ;
        clearPreview();
        previewContext.globalCompositeOperation = 'source-over';
        previewContext.strokeStyle = 'rgb(' + color.r + ',' + color.g + ',' +
            color.b + ')';
        previewContext.fillStyle = 'rgba(' + fill.r + ',' + fill.g + ',' +
            fill.b + ',' + brushProperties.opacity + ')';
        previewContext.lineWidth = Math.round(brushProperties.size / 2.0) * 2;
        previewContext.lineCap = 'round';
        previewContext.lineJoin = 'round';
        previewContext.strokeRect(x, y, w, h);
        previewContext.fillRect(x + size / 2.0, y + size / 2.0, w - size,
            h - size);
    }

    function drawRectangle(dimensions, brushProperties) {
        var
            x = dimensions.x,
            y = dimensions.y,
            w = dimensions.width,
            h = dimensions.height,
            size = brushProperties.size,
            color = brushProperties.color,
            fill = brushProperties.fill
        ;
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = 'rgb(' + color.r + ',' + color.g + ',' +
            color.b + ')';
        context.fillStyle = 'rgba(' + fill.r + ',' + fill.g + ',' +
            fill.b + ',' + brushProperties.opacity + ')';
        context.lineWidth = Math.round(brushProperties.size / 2.0) * 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeRect(x, y, w, h);
        context.fillRect(x + size / 2.0, y + size / 2.0, w - size, h - size);
    }

    function clear() {
        context.clearRect(0, 0, container.width(), container.height())
    }

    function clearPreview() {
        previewContext.clearRect(0, 0, container.width(), container.height());
    }

    function initUi() {
        container = $('#drawingSurface');
        clearButton = $('#clear');

        var canvasElem = $('<canvas width="' + container.width() +
            '" height="' + container.height() + '"></canvas>');
        canvasElem.appendTo(container);
        context = canvasElem[0].getContext('2d');

        var previewCanvasElem = $('<canvas width="' + container.width() +
            '" height="' + container.height() + '"></canvas>');
        previewCanvasElem.appendTo(container);
        previewContext = previewCanvasElem[0].getContext('2d');

        container.live('drag dragstart dragend', function(event) {
            var
                x = event.layerX,
                y = event.layerY,
                type = event.handleObj.type,
                brushProperties = brush.get()
            ;
            switch (brushProperties.type) {
                case 'pen':
                case 'eraser':
                    switch (type) {
                        case 'dragstart':
                            startPoint = {x:x, y:y};
                            break;
                        case 'drag':
                            startPoint && canvas.addCommand({
                                name:'drawPath',
                                points:[
                                    startPoint,
                                    {x:x, y:y}
                                ],
                                brushProperties:brushProperties
                            });
                            startPoint = {x:x, y:y};
                            break;
                        case 'dragend':
                            startPoint = null;
                            break;
                    }
                    break;
                case 'rectangle':
                    switch (type) {
                        case 'dragstart':
                            startPoint = {x:x, y:y};
                            break;
                        case 'drag':
                            previewRectangle(
                                {
                                    x:Math.min(x, startPoint.x),
                                    y:Math.min(y, startPoint.y),
                                    width:Math.abs(x - startPoint.x),
                                    height:Math.abs(y - startPoint.y)
                                },
                                brush.get()
                            );
                            break;
                        case 'dragend':
                            canvas.addCommand({
                                name:'drawRectangle',
                                dimensions:{
                                    x:Math.min(x, startPoint.x),
                                    y:Math.min(y, startPoint.y),
                                    width:Math.abs(x - startPoint.x),
                                    height:Math.abs(y - startPoint.y)
                                },
                                brushProperties:brushProperties
                            });
                            clearPreview();
                            startPoint = null;
                            break;
                    }
            }
        });

        clearButton.button();
        clearButton.click(function () {
            canvas.addCommand({
                name:'clear'
            })
        });
    }

    function updateUi() {
    }

    canvas.onadd(function () {
        var commands = canvas.getCommands();
        executeCommand(commands[commands.length - 1]);
    });

    $(document).ready(initUi);
    $(document).ready(updateUi);

    return {
        initUi:initUi,
        updateUi:updateUi
    };
}
