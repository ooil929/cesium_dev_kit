import * as dat from 'dat.gui';
/**
 * 控件模块
 * @param {*} viewer
 */
function Control(viewer) {
  if (viewer) {
    this._installFileDragDropHandler()
  }
}

Control.prototype = {
  /**
   * 拖拽加载
   */
  _installFileDragDropHandler() {
    function FileDragDropHandler(targetDiv, viewer) {
      var dragBox = document.createElement('div')
      dragBox.id = 'fileDragDrop'
      dragBox.classList.add('filedragdrop')
      dragBox.innerHTML = '请将Json文件拖拽到此区域'
      this._dragBox = dragBox
      this._viewer = viewer
      this._parentDiv = targetDiv
      targetDiv.appendChild(dragBox)
      this.fileDragDropCallBack = undefined
      this.callBackParms = undefined
    }

    FileDragDropHandler.prototype.startuploadfile = function () {
      var _this = this
      var oBox = _this._dragBox
      var timer = null
      document.ondragover = function () {
        clearTimeout(timer)
        timer = setTimeout(function () {
          //  oBox.style.display = 'none';
          oBox.innerHTML = '请将文件拖拽到此区域'
        }, 200)
        // oBox.style.display = 'block';
      }
      //进入子集的时候 会触发ondragover 频繁触发 不给ondrop机会
      oBox.ondragenter = function () {
        oBox.innerHTML = '请释放鼠标'
      }
      oBox.ondragover = function () {
        return false
      }
      oBox.ondragleave = function () {
        oBox.innerHTML = '请将文件拖拽到此区域'
      }
      oBox.ondrop = function (ev) {
        ev.preventDefault()
        var oFile = ev.dataTransfer.files[0]
        var reader = new FileReader()
        reader.readAsText(oFile, 'UTF-8')
        //读取成功
        reader.onload = function () {
          var data = JSON.parse(this.result)
          if (_this.fileDragDropCallBack) {
            //回调函数，callBackParms为回调函数的参数,需要自己传入，data与_this._viewer不需要传入，但是声明的回调函数中要有该参数
            _this.fileDragDropCallBack(_this.callBackParms, data, _this._viewer)
          }
        }
        reader.onloadstart = function () {
          //alert('读取开始');
        }
        reader.onloadend = function () {
          // alert('读取结束');
        }
        reader.onabort = function () {
          alert('读取数据中断')
        }
        reader.onerror = function () {
          alert('读取数据失败')
        }
        return false
      }
    }

    function FileDragDropMixin(viewer) {
      var fileDragDropHandler = new FileDragDropHandler(document.querySelector('.cesium-viewer'), viewer)
      Object.defineProperties(viewer, {
        fileDragDropMixin: {
          get: function () {
            return fileDragDropHandler
          }
        }
      })
    }

    Cesium.Scene.FileDragDropMixin = FileDragDropMixin
  },
  /**
   * 加载本地数据
   * @param {*} param
   */
  showLoadDataToScenePanel(param) {
    param = param || {}
    if (param) {
      let gui = new dat.GUI()
      let viewer = this._viewer
      let geojson = gui.addFolder('加载数据文件')
      let commonUpload = (callback) => {
        let inputUpload = document.createElement('input')
        inputUpload.type = 'file'
        inputUpload.className = 'datgui_upload'
        inputUpload.onchange = function () {
          if (typeof callback === 'function' && inputUpload.files.length) {

            callback(URL.createObjectURL(inputUpload.files[0]))
          }
        }
        document.getElementsByTagName('body') && document.getElementsByTagName('body')[0].appendChild(inputUpload)
        inputUpload.click()
      }
      let geojsonParam = {
        'point': () => {
          commonUpload((fileData) => {
            var promise = Cesium.GeoJsonDataSource.load(fileData)
            promise.then(function (dataSource) {
              viewer.dataSources.add(dataSource)
              var entities = dataSource.entities.values
              for (var o = 0; o < entities.length; o++) {
                var r = entities[o]
                r.nameID = o
                r.point = {
                  color: Cesium.Color.BLUE
                }
              }
              viewer.flyTo(dataSource)
            })
          })
        },
        'polyline': () => {
          commonUpload((fileData) => {
            var promise = Cesium.GeoJsonDataSource.load(fileData)
            promise.then(function (dataSource) {
              viewer.dataSources.add(dataSource)
              var entities = dataSource.entities.values
              for (var o = 0; o < entities.length; o++) {
                var r = entities[o]
                r.nameID = o
                r.polyline.width = 5;
                (r.polyline.material = new Cesium.PolylineGlowMaterialProperty({
                  glowPower: .1,
                  color: Cesium.Color.ORANGERED.withAlpha(.9)
                }), 10)
              }
              viewer.flyTo(dataSource)
            })
          })
        },
        'polygon': () => {
          commonUpload((fileData) => {
            var promise = Cesium.GeoJsonDataSource.load(fileData)
            promise.then(function (dataSource) {
              viewer.dataSources.add(dataSource)
              var entities = dataSource.entities.values
              for (var o = 0; o < entities.length; o++) {
                var r = entities[o]
                r.nameID = o
                r.polygon.width = 10
                r.polygon.material = Cesium.Color.BLUE.withAlpha(.9)
              }
              viewer.flyTo(dataSource)
            })
          })
        },
        'model': () => {
          commonUpload((fileData) => {
            viewer.flyTo(d3kit.createModelGraphics({
              position: Cesium.Cartesian3.fromDegrees(120.38105869, 31.10115627),
              m_url: fileData
            }))
          })
        },
        'czml': () => {
          commonUpload((fileData) => {
            viewer.flyTo(viewer.dataSources.add(Cesium.CzmlDataSource.load(fileData)))
          })
        },
        '3dtilset': () => {
          commonUpload((fileData) => {
            viewer.flyTo(viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
              url: fileData
            })))
          })
        }
      }
      geojson.add(geojsonParam, 'point')
      geojson.add(geojsonParam, 'polyline')
      geojson.add(geojsonParam, 'polygon')
      geojson.add(geojsonParam, 'model')
      geojson.add(geojsonParam, 'czml')
      geojson.add(geojsonParam, '3dtilset')
      geojson.open()
    }
  },
  /**
   * 后处理面板
   * @param {*} param
   */
  showPostProcessStagesPanel(param) {
    param = param || {}
    let Options = function () {
      this.blackAndWhiteShow = false
      this.blackAndWhiteGradations = 5.0
      this.brightnessShow = false
      this.brightnessValue = 0.5
      this.nightVisionShow = false
      this.silhouette = false
    }
    let option = new Options()
    let gui = new dat.GUI()
    let viewer = this._viewer
    let stages = viewer.scene.postProcessStages
    let silhouette = stages.add(Cesium.PostProcessStageLibrary.createSilhouetteStage())
    let blackAndWhite = stages.add(Cesium.PostProcessStageLibrary.createBlackAndWhiteStage())
    let brightness = stages.add(Cesium.PostProcessStageLibrary.createBrightnessStage())
    let nightVision = stages.add(Cesium.PostProcessStageLibrary.createNightVisionStage())
    //config
    silhouette.uniforms.color = param.silhouetteColor || Cesium.Color.YELLOW
    silhouette.enabled = false
    blackAndWhite.enabled = false
    blackAndWhite.uniforms.gradations = 5.0
    brightness.enabled = false
    brightness.uniforms.brightness = 0.5
    nightVision.enabled = false
    gui.add(option, 'blackAndWhiteShow').name('blackAndWhiteShow').onChange(function (value) {
      blackAndWhite.enabled = value
    })
    gui.add(option, 'blackAndWhiteGradations', 0, 10, 0.1).name('blackAndWhiteGradations').onChange(function (value) {
      blackAndWhite.uniforms.gradations = value
    })
    gui.add(option, 'brightnessShow').name('brightnessShow').onChange(function (value) {
      brightness.enabled = value
    })
    gui.add(option, 'brightnessValue', 0, 10, 0.1).name('brightnessValue').onChange(function (value) {
      brightness.uniforms.brightness = value
    })
    gui.add(option, 'nightVisionShow').name('nightVisionShow').onChange(function (value) {
      nightVision.enabled = value
    })
    gui.add(option, 'silhouette').name('silhouette').onChange(function (value) {
      silhouette.enabled = value
    })
  },
  /**
   * 环境控制
   * @param {*}
   */
  showSceneBloomPanel(param) {
    let Options = function () {
      this.contrast = 128
      this.brightness = -0.3
      this.delta = 1
      this.gamma = 3.5
      this.enabled = false
      this.highDynamicRange = false
      this.shadows = false
      this.glowOnly = false
      this.sigma = 1.0
      this.stepSize = 5.0
    }
    let option = new Options()
    let gui = new dat.GUI()
    let viewer = this._viewer
    gui.__closeButton.innerHTML = '收缩面板'

    let bloom = viewer.scene.postProcessStages.bloom

    gui.add(option, 'enabled').name('bloom').onChange(function (value) {
      bloom.enabled = value
    })
    gui.add(option, 'glowOnly').name('发光').onChange(function (value) {
      bloom.uniforms.glowOnly = value
    })
    gui.add(option, 'enabled').name('启用模糊').onChange(function (value) {
      bloom.enabled = value
    })
    gui.add(option, 'contrast', -255.0, 255.0, 0.01).name('对比度').onChange(function (value) {
      bloom.uniforms.contrast = value
    })
    gui.add(option, 'brightness', -1.0, 1.0, 0.01).name('光泽亮度').onChange(function (value) {
      bloom.uniforms.brightness = value
    })
    gui.add(option, 'delta', 1, 5, 0.01).name('因子').onChange(function (value) {
      bloom.uniforms.delta = value
    })
    gui.add(option, 'sigma', 1, 10, 0.01).name('sigma').onChange(function (value) {
      bloom.uniforms.sigma = value
    })
    gui.add(option, 'stepSize', 0.1, 10).name('stepSize').onChange(function (value) {
      bloom.uniforms.stepSize = value
    })
    gui.add(option, 'shadows').name('启用阴影').onChange(function (value) {
      viewer.shadows = value
    })
    gui.add(option, 'highDynamicRange').name('高动态范围').onChange(function (value) {
      viewer.scene.highDynamicRange = value
    })
    gui.add(option, 'gamma', 1, 10, 0.01).name('伽马亮度').onChange(function (value) {
      viewer.scene.gamma = value
    })
  },
  /**
   * 矩阵调整面板
   * @param {*} primitives
   */
  showPrimitiveMatrixPanel(primitives) {
    let primitive = primitives._delegate || primitives,
      // 全局定义
      viewer = this._viewer

    // eslint-disable-next-line no-unused-vars
    const update3dtilesMaxtrix = function (params) {
      //旋转
      let mx = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(params.rx))
      let my = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(params.ry))
      let mz = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(params.rz))
      let rotationX = Cesium.Matrix4.fromRotationTranslation(mx)
      let rotationY = Cesium.Matrix4.fromRotationTranslation(my)
      let rotationZ = Cesium.Matrix4.fromRotationTranslation(mz)
      //平移
      let position = Cesium.Cartesian3.fromDegrees(params.tx, params.ty, params.tz)
      let m = Cesium.Transforms.eastNorthUpToFixedFrame(position)

      let scale = Cesium.Matrix4.fromUniformScale(0.85)
      // //缩放
      Cesium.Matrix4.multiply(m, scale, m)
      //旋转、平移矩阵相乘
      Cesium.Matrix4.multiply(m, rotationX, m)
      Cesium.Matrix4.multiply(m, rotationY, m)
      Cesium.Matrix4.multiply(m, rotationZ, m)
      //赋值给tileset
      return m
    }

    let gui = new dat.GUI()

    //高度
    let heightMatrix = {
      height: 100
    }
    let height = gui.addFolder('离地高度')
    height.add(heightMatrix, 'height', 0, 1000, 1).onChange(function (value) {

      var boundingSphere = primitives.boundingSphere
      var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center)
      var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0)
      var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, value)
      var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3())
      primitives.modelMatrix = Cesium.Matrix4.fromTranslation(translation)
    })
    height.open()
    //缩放矩阵
    let scale = gui.addFolder('缩放大小')
    let scaleParam = {
      'm+Scale': () => {
        primitive.readyPromise.then(data => {
          let modelMatrix = data.root.transform
          Cesium.Matrix4.multiplyByUniformScale(modelMatrix, 1.2, modelMatrix)
          data.root.transform = modelMatrix
        })
      },
      'm-Scale': () => {
        primitive.readyPromise.then(data => {
          let modelMatrix = data.root.transform
          Cesium.Matrix4.multiplyByUniformScale(modelMatrix, 0.8, modelMatrix)
          data.root.transform = modelMatrix
        })
      }
    }
    scale.add(scaleParam, 'm+Scale')
    scale.add(scaleParam, 'm-Scale')
    scale.open()
    let translationMatrix = {
      x: 0,
      y: 0,
      z: 0
    }
    //平移矩阵
    let translationParam = {
      'x+Axis': () => {
        translationMatrix.x += 1
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(20, 0, 0))
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix)
      },
      'x-Axis': () => {
        translationMatrix.x -= 1
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(-20, 0, 0))
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix)
      },
      'y+Axis': () => {
        translationMatrix.y += 1
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 20, 0))
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix)
      },
      'y-Axis': () => {
        translationMatrix.y -= 1
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, -20, 0))
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix)
      },
      'z+Axis': () => {
        translationMatrix.z += 1
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, 20))
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix)
      },
      'z-Axis': () => {
        translationMatrix.z -= 1
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, -20))
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix)
      }
    }
    let translation = gui.addFolder('矩阵平移')
    translation.add(translationParam, 'x+Axis')
    translation.add(translationParam, 'x-Axis')
    translation.add(translationParam, 'y+Axis')
    translation.add(translationParam, 'y-Axis')
    translation.add(translationParam, 'z+Axis')
    translation.add(translationParam, 'z-Axis')
    translation.open()

    //旋转矩阵
    let rotationMatrix = {
      x: 0,
      y: 0,
      z: 0
    }
    let rotationParam = {
      'x+Axis': () => {
        rotationMatrix.x += 15
        primitive.readyPromise.then(data => {
          const angel = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotationMatrix.x))
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center)
          Cesium.Matrix4.multiply(m, rotation, m)
          // const rotationX =  Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotationMatrix.x)))
          // const rotationY =  Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotationMatrix.y)))
          // const rotationZ =  Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotationMatrix.z)))
          // Cesium.Matrix4.multiply(m, rotationX, m);
          // Cesium.Matrix4.multiply(m, rotationY, m);
          // Cesium.Matrix4.multiply(m, rotationZ, m);

          data._root.transform = m
        })
      },
      'x-Axis': () => {
        rotationMatrix.x -= 15
        primitive.readyPromise.then(data => {
          const angel = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotationMatrix.x))
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center)
          Cesium.Matrix4.multiply(m, rotation, m)
          data._root.transform = m
        })
      },
      'y+Axis': () => {
        rotationMatrix.y += 15
        primitive.readyPromise.then(data => {
          const angel = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotationMatrix.y))
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center)
          Cesium.Matrix4.multiply(m, rotation, m)
          data._root.transform = m
        })
      },
      'y-Axis': () => {
        rotationMatrix.y -= 15
        primitive.readyPromise.then(data => {
          const angel = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotationMatrix.y))
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center)
          Cesium.Matrix4.multiply(m, rotation, m)
          data._root.transform = m
        })
      },
      'z+Axis': () => {
        rotationMatrix.z += 15
        primitive.readyPromise.then(data => {
          const angel = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotationMatrix.z))
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center)
          Cesium.Matrix4.multiply(m, rotation, m)
          data._root.transform = m
        })
      },
      'z-Axis': () => {
        rotationMatrix.z -= 15
        primitive.readyPromise.then(data => {
          const angel = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotationMatrix.z))
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center)
          Cesium.Matrix4.multiply(m, rotation, m)
          data._root.transform = m
        })
      }
    }
    let rotation = gui.addFolder('旋转矩阵')
    rotation.add(rotationParam, 'x+Axis')
    rotation.add(rotationParam, 'x-Axis')
    rotation.add(rotationParam, 'y+Axis')
    rotation.add(rotationParam, 'y-Axis')
    rotation.add(rotationParam, 'z+Axis')
    rotation.add(rotationParam, 'z-Axis')
    rotation.open()

    gui.__closeButton.innerHTML = '收缩面板'
  },
  /**
   * 图层参数调整
   * @param {*} options
   */
  showLayerParamPanel: function (layer) {
    if (layer) {
      var gui = new dat.GUI()
      var layerObj = new function () {
        this.alpha = layer.alpha
        this.brightness = layer.brightness
        this.contrast = layer.contrast
        this.gamma = layer.gamma
        this.hue = layer.hue
        this.dayAlpha = layer.dayAlpha
        this.nightAlpha = layer.nightAlpha
        this.saturation = layer.saturation
      }
      var layerParam = gui.addFolder('图层调整')
      layerParam.add(layerObj, 'alpha', 0, 1, 0.05).name('透明度').onChange(function (value) {
        layer.alpha = value
      })
      layerParam.add(layerObj, 'brightness', 0, 5, 0.05).name('亮度').onChange(function (value) {
        layer.brightness = value
      })
      layerParam.add(layerObj, 'contrast', 0, 5, 0.05).name('对比').onChange(function (value) {
        layer.contrast = value
      })
      layerParam.add(layerObj, 'gamma', 0, 5, 0.05).name('伽马').onChange(function (value) {
        layer.gamma = value
      })
      layerParam.add(layerObj, 'hue', 0, 5, 0.05).name('色调').onChange(function (value) {
        layer.hue = value
      })
      layerParam.add(layerObj, 'dayAlpha', 0, 1, 0.05).name('白天透明').onChange(function (value) {
        layer.dayAlpha = value
      })
      layerParam.add(layerObj, 'nightAlpha', 0, 1, 0.05).name('夜晚透明').onChange(function (value) {
        layer.nightAlpha = value
      })
      layerParam.add(layerObj, 'saturation', 0, 5, 0.05).name('饱和').onChange(function (value) {
        layer.saturation = value
      })

      layerParam.open()
    }
  },
  /**
   * 图层切换
   * @param {*} options
   */
  showLayerSwitchPanel: function (layers) {
    if (layers && layers.length) {
      var gui = new dat.GUI()

      var layerObj = new function () {
        for (let i in layers) {
          this[layers[i].id] = layers[i].show
        }
      }
      var layerSwitch = gui.addFolder('图层切换')
      for (let i in layers) {
        layerSwitch.add(layerObj, layers[i].id).name(layers[i].name).onChange(function (value) {
          layers[i].show = value
        })
      }
      var layerAlphaObj = new function () {
        for (let i in layers) {
          this[layers[i].id] = layers[i].alpha
        }
      }
      var layerAlpha = gui.addFolder('透明度')
      for (let i in layers) {
        layerAlpha.add(layerAlphaObj, layers[i].id, 0, 1, 0.05).name(layers[i].name).onChange(function (value) {
          layers[i].alpha = value
        })
      }
      layerSwitch.open()
      layerAlpha.open()
    }
  },
  /**
   * 场景效果调整面板
   * @param {*} opt
   */
  showSceneEffectEditPanel: function (options) {
    options = options || {}
    if (dat.GUI && this._viewer.scene.colorCorrection) {

      var gui = new dat.GUI(),
        viewer = this._viewer

      /**
       * 初始化场景
       */
      //设置环境光
      viewer.scene.lightSource.ambientLightColor = options.ambientLightColor || new Cesium.Color(0.3, 0.3, 0.3, 1)
      //开启颜色校正
      viewer.scene.colorCorrection.show = options.colorCorrection || false
      viewer.scene.colorCorrection.saturation = options.saturation || 3.1
      viewer.scene.colorCorrection.brightness = options.brightness || 1.8
      viewer.scene.colorCorrection.contrast = options.contrast || 1.2
      viewer.scene.colorCorrection.hue = options.hue || 0

      //开启泛光和HDR
      viewer.scene.bloomEffect.show = options.bloomEffect || false
      viewer.scene.hdrEnabled = options.hdrEnabled || true
      viewer.scene.bloomEffect.threshold = options.threshold || 1
      viewer.scene.bloomEffect.bloomIntensity = options.bloomIntensity || 2

      /**
       * 初始化dat
       */
      var sceneObj = new function () {
        //泛光开关
        this.bloomEffectShow = options.bloomEffect || false
        //泛光阈值
        this.bloomThreshold = options.threshold || 1
        //泛光强度
        this.bloomIntensity = options.bloomIntensity || 2
        //环境光
        this.ambientLightColor = options.ambientLightColor || 0.3
        //HDR开关
        this.hdrEnabled = options.hdrEnabled || true
        //颜色校正
        this.colorCorrectionShow = false
        //饱和度
        this.colorCorrectionSaturation = options.saturation || 3.1
        //亮度
        this.colorCorrectionBrightness = options.brightness || 1.8
        //对比度
        this.colorCorrectionContrast = options.contrast || 1.2
        //色调
        this.colorCorrectionHue = options.hue || 0
      }
      var sceneEffect = gui.addFolder('场景效果')
      console.log('sceneEffect:', sceneObj)
      sceneEffect.add(sceneObj, 'bloomEffectShow').name('泛光开关').onChange(function (value) {
        viewer.scene.bloomEffect.show = value
        viewer.scene.bloomEffect.threshold = sceneObj.bloomThreshold
        viewer.scene.bloomEffect.bloomIntensity = sceneObj.bloomIntensity
      })
      sceneEffect.add(sceneObj, 'bloomThreshold', 0, 1, 0.1).name('泛光阈值').onChange(function (value) {
        viewer.scene.bloomEffect.threshold = value
      })
      sceneEffect.add(sceneObj, 'bloomIntensity', 0, 10, 0.1).name('泛光强度').onChange(function (value) {
        viewer.scene.bloomEffect.bloomIntensity = value
      })
      sceneEffect.add(sceneObj, 'hdrEnabled').name('HDR开关').onChange(function (value) {
        viewer.scene.hdrEnabled = value
      })
      sceneEffect.add(sceneObj, 'colorCorrectionShow').name('颜色校正').onChange(function (value) {
        viewer.scene.colorCorrection.show = value
      })
      sceneEffect.add(sceneObj, 'colorCorrectionSaturation', 0, 5, 0.1).name('饱和度').onChange(function (value) {
        viewer.scene.colorCorrection.saturation = value
      })
      sceneEffect.add(sceneObj, 'colorCorrectionBrightness', 0, 5, 0.1).name('亮度').onChange(function (value) {
        viewer.scene.colorCorrection.brightness = value
      })
      sceneEffect.add(sceneObj, 'colorCorrectionContrast', 0, 5, 0.1).name('对比度').onChange(function (value) {
        viewer.scene.colorCorrection.contrast = value
      })
      sceneEffect.add(sceneObj, 'colorCorrectionHue', 0, 5, 0.1).name('色调').onChange(function (value) {
        viewer.scene.hdrEnabled = value
      })
      sceneEffect.add(sceneObj, 'colorCorrectionHue', 0, 1, 0.1).name('环境光').onChange(function (value) {
        viewer.scene.lightSource.ambientLightColor = new Cesium.Color(value, value, value, 1)
      })
      sceneEffect.open()
    }
  },
  /**
   * 位置姿态编辑面板啊
   * @param {*} Entity
   */
  showEntityOrientationEditPanel: function (Entity) {
    if (Entity) {
      var gui = new dat.GUI()

      var OrientationObj = new function () {

        this.heading = 360

        this.pitch = 1

        this.roll = 1
      }
      var Orientation = gui.addFolder('实体姿态调整'),
        $this = this
      Orientation.add(OrientationObj, 'heading', 0, 360, 1).name('角度').onChange(function (value) {

        OrientationObj.heading = value
        Entity.orientation =
          Cesium.Transforms.headingPitchRollQuaternion(
            Entity.position.getValue($this._viewer.clock.currentTime),
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(OrientationObj.heading),
              Cesium.Math.toRadians(OrientationObj.pitch),
              Cesium.Math.toRadians(OrientationObj.roll)
            ))
      })

      Orientation.add(OrientationObj, 'pitch', 0, 360, 1).name('航向').onChange(function (value) {

        OrientationObj.pitch = value
        Entity.orientation =
          Cesium.Transforms.headingPitchRollQuaternion(
            Entity.position.getValue($this._viewer.clock.currentTime),
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(OrientationObj.heading),
              Cesium.Math.toRadians(OrientationObj.pitch),
              Cesium.Math.toRadians(OrientationObj.roll)
            ))
      })

      Orientation.add(OrientationObj, 'roll', 0, 360, 1).name('翻转').onChange(function (value) {

        OrientationObj.roll = value
        Entity.orientation =
          Cesium.Transforms.headingPitchRollQuaternion(
            Entity.position.getValue($this._viewer.clock.currentTime),
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(OrientationObj.heading),
              Cesium.Math.toRadians(OrientationObj.pitch),
              Cesium.Math.toRadians(OrientationObj.roll)
            ))
      })
      Orientation.open()
    }
  }
}