sap.ui.define([
    'dinewkorder/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/m/MultiInput',
    'sap/m/SearchField',
    'sap/ui/model/type/String',
    'sap/m/Label',
    'sap/m/Column',
    'sap/ui/table/Column',
    'sap/m/Text',
    'sap/m/Input',
    'sap/m/Token',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/m/DatePicker',
    'sap/m/Select',
    'sap/ui/model/odata/v2/ODataModel'
],
function (Controller, JSONModel, MessageBox, MessageToast, MultiInput, SearchField, TypeString, Label, MColumn, UIColumn, Text, Input, Token, Filter, FilterOperator, DatePicker, Select, ODataModel) {
    "use strict";

    return Controller.extend("dinewkorder.controller.PageMP", {
        onInit: function () {
			this.getRouter().getRoute("PageMP").attachMatched(this._onRouteMatched, this);

            this.initializeValueHelpInputs();
            
            //작업지시 생성 라우팅 모델 설정
            this.setModel(this.createProductionRoutingModel(), "WorkOrderAPI");
        },

		_onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {
            this.modelData();
		},

        createProductionRoutingModel: function () {
            var oModel = new ODataModel('/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2');
            console.log("oModel",oModel);
            return oModel;
        },

        setModelData: function () {
            var inputIds = [
                "plantVH", "prodVerVH", "prodLvlVH", 
                "schedPriVH", "materialVH", "mfgOrderType", "mfgOrderTypeName", 
                "mfgOrderPlannedTotalQty", "startDate", "lotSize", "prodDescription", "schedDescription", "prodAnnotaion"
            ];
            
            inputIds.forEach(function(sId) {
                var oControl = this.byId(sId);
                
                if (oControl instanceof MultiInput) {
                    // MultiInput의 경우 토큰을 지움
                    oControl.setTokens([]);
                } else if (oControl instanceof Input) {
                    // 일반 Input의 경우 값을 지움
                    oControl.setValue("");
                } else if (oControl instanceof DatePicker) {
                    // DatePicker의 경우 날짜를 초기화
                    oControl.setValue("");
                    oControl.setDateValue(null);
                } else if (oControl instanceof Select) {
                    // Select의 경우 선택된 키를 초기화
                    oControl.setSelectedKey(null);
                    oControl.setValue("");
                }
            }.bind(this));
        },         

        // model db
        modelData: function () {
            var oDineModel = this.getOwnerComponent().getModel("mainData");
            var oMainModel = this.getOwnerComponent().getModel("dineData");

            var rankModelData = function(url, modelName) {
            this._getODataRead(oDineModel, url).then(function(dinedata){
                this.setModel(new JSONModel(dinedata), modelName);
                }.bind(this));
            }.bind(this);

            // commonModelData 함수를 this와 바인딩하여 정의
            var commonModelData = function(url, modelName) {
                this._getODataRead(oMainModel, url).then(function(commonData) {
                    var oModel = new JSONModel(commonData);
                    this.setModel(oModel, modelName);

                    // 모델이 mfgOrderModel일 때
                    if (modelName === "mfgOrderModel") {
                        var oMfgOrderModel = this.getModel("mfgOrderModel");
                        var aData = oMfgOrderModel.getProperty("/");
                        
                        if (aData.length > 0) {
                            var sSelectedKey = aData[0].ManufacturingOrderType;
                            console.log("Selected Key", sSelectedKey);
                    
                            var sManufacturingOrderTypeName = aData.find(function(item) {
                                return item.ManufacturingOrderType === sSelectedKey;
                            })?.ManufacturingOrderTypeName || "";

                            var oInput = this.byId("mfgOrderTypeName"); 
                            oInput.setValue(sManufacturingOrderTypeName);
                        }
                    }                    
                }.bind(this));
            }.bind(this); // commonModelData 함수 자체에 this를 바인딩

            // 함수 호출 시 this가 올바르게 참조되도록 수정
            commonModelData("/SalesOrder", "soModel");
            commonModelData("/ProductionVersion", "prodVerModel"); 
            commonModelData("/MfgOrder", "mfgOrderModel"); 
            commonModelData("/Product", "productModel");
            commonModelData("/Plant", "plantModel");
            rankModelData("/ProdOrder", "dataModel");
            rankModelData("/ProdLvl", "prodLvlModel");
            rankModelData("/SchedPri", "schedPriModel");

            
        },

         // MultiInput 초기화 및 설정
         initializeValueHelpInputs: function() {
            this.aMultiInputs = ["materialVH", "plantVH", "prodVerVH", "prodLvlVH", "schedPriVH"];
        
            this.aMultiInputs.forEach(function(sId) {
                var oMultiInput = this.byId(sId);
                if (oMultiInput) {
                    oMultiInput.attachBrowserEvent("focusout", this.onPageVHFocusOut.bind(this));
                    oMultiInput.attachEvent("change", this.onTokenDelete, this);
                    }
                }.bind(this));
            },   

        // valuehelp
        onPageVH: function (oEvent) {
            // ValueHelpDialog의 ID에 따라 변수를 설정
            var sValueHelpId = oEvent.getSource().getId();
            var filterName, label, keys, modelName, columnLabels, inputId, filterPaths;
        
            // ID에 따라 조건을 설정
            if (sValueHelpId.includes("materialVH")) {
                filterName = "ProductVH";
                label = "제품";
                keys = ["Product","ProductExternalID", "IndustrySector", "ProductType", "ProductGroup", "GrossWeight", "NetWeight", "WeightUnit"];
                modelName = "productModel";
                columnLabels = ["제품", "제품 외부 ID", "산업 부문", "제품 유형", "제품 그룹", "총 중량", "순 중량", "무게 단위"];
                inputId = "materialVH";
                filterPaths = ["Product","ProductExternalID", "IndustrySector", "ProductType", "ProductGroup", "GrossWeight", "NetWeight", "WeightUnit"];
        
            } else if (sValueHelpId.includes("plantVH")) {
                filterName = "PlantVH";
                label = "플랜트";
                keys = ["Plant", "PlantName"];
                modelName = "plantModel";
                columnLabels = ["플랜트", "플랜트명"];
                inputId = "plantVH";
                filterPaths = ["Plant", "PlantName"];

            } else if (sValueHelpId.includes("prodVerVH")) {
                filterName = "ProductVerVH";
                label = "생산 버전";
                keys = ["ProductionVersion", "Material", "Plant", "ProductionVersionText"];
                modelName = "prodVerModel";
                columnLabels = ["생산 버전", "제품", "플랜트", "생산 버전명"];
                inputId = "prodVerVH";
                filterPaths = ["ProductionVersion", "Material", "Plant", "ProductionVersionText"];

            } else if (sValueHelpId.includes("prodLvlVH")) {
                filterName = "RankVH";
                label = "생산 순위";
                keys = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];
                modelName = "prodLvlModel";
                columnLabels = ["회사 코드", "참조 코드 타입", "참조 코드", "상세 설명", "활성화 여부", "참조 값"];
                inputId = "prodLvlVH";
                filterPaths = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];

            } else if (sValueHelpId.includes("schedPriVH")) {
                filterName = "RankVH";
                label = "우선 순위";
                keys = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];
                modelName = "schedPriModel";
                columnLabels = ["회사 코드", "참조 코드 타입", "참조 코드", "상세 설명", "활성화 여부", "참조 값"];
                inputId = "schedPriVH";
                filterPaths = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];

            } 
            var keyId = (sValueHelpId.includes("prodLvlVH") || sValueHelpId.includes("schedPriVH") ? keys[2] : keys[0]);
            this.oSuggestion = new MultiInput();
            this.oSearchSuggestion = new SearchField();
        
            this.loadFragment({
                name: `dinewkorder.view.Fragments.${filterName}`
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar();
                
                oDialogSuggestions.setKey(keyId);
                console.log("keyid",keyId);
                this.vhdSuggestions = oDialogSuggestions;
                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: label,
                    key: keyId, // 기본 키 필드 설정
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);
        
                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this.oSearchSuggestion);
        
                // 기본 검색이 실행될 때 FilterBar 검색 트리거
                this.oSearchSuggestion.attachSearch(function () {
                    oFilterBar.search();
                }.bind(this));

                console.log("this.oSearchSuggestion",this.oSearchSuggestion);
        
                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel(modelName));
        
                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: `${modelName}>/`,
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
        
                        if (filterName === "ProductVH") {
                            // 제품
                            var oColumnProductid = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnProductid.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnProductid);
                            
                            // 제품 외부 ID
                            var oColumnProductExternalID = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnProductExternalID.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnProductExternalID);

                            // 산업 부문
                            var oColumnIndustrySector = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnIndustrySector.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnIndustrySector);

                            // 제품 유형
                            var oColumnProductType = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnProductType.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnProductType);

                            // 제품 그룹
                            var oColumnProductGroup = new UIColumn({
                                label: new Label({ text: columnLabels[4] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[4]}}` })
                            });
                            oColumnProductGroup.data({ fieldName: keys[4] });
                            oTable.addColumn(oColumnProductGroup);

                             // 총 중량
                             var oColumnGrossWeight = new UIColumn({
                                label: new Label({ text: columnLabels[5] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[5]}}` })
                            });
                            oColumnGrossWeight.data({ fieldName: keys[5] });
                            oTable.addColumn(oColumnGrossWeight);

                             // 순 중량
                             var oColumnNetWeight = new UIColumn({
                                label: new Label({ text: columnLabels[6] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[6]}}` })
                            });
                            oColumnNetWeight.data({ fieldName: keys[6] });
                            oTable.addColumn(oColumnNetWeight);

                             // 무게 단위
                             var oColumnWeightUnit = new UIColumn({
                                label: new Label({ text: columnLabels[7] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[7]}}` })
                            });
                            oColumnWeightUnit.data({ fieldName: keys[7] });
                            oTable.addColumn(oColumnWeightUnit);
        
                        } else if (filterName === "PlantVH") {
                            // 플랜트
                            var oColumnPlant = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnPlant.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnPlant);
                            
                            // 플랜트명
                            var oColumnPlantName = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnPlantName.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnPlantName);
        
                        } else if (filterName === "ProductVerVH") {
                            // 생산 버전
                            var oColumnProductionVersion = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnProductionVersion.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnProductionVersion);
                            
                            // 플랜트
                            var oColumnPlant = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnPlant.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnPlant);
                            
                            // 제품
                            var oColumnMaterial = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnMaterial.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnMaterial);

                             // 생산 버전명
                             var oColumnProductionVersionText = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnProductionVersionText.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnProductionVersionText);

                        } else if (filterName === "RankVH") {
                            // 회사 코드
                            var oColumnCompanycode = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnCompanycode.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnCompanycode);
                            
                            // 참조 코드 타입
                            var oColumnReferencecodetype = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnReferencecodetype.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnReferencecodetype);
                            
                            // 참조 코드
                            var oColumnReferencecodeid = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnReferencecodeid.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnReferencecodeid);
                            
                            // 상세 설명
                            var oColumnDescription = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnDescription.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnDescription);

                            // 활성화 여부
                            var oColumnActivestate = new UIColumn({
                                label: new Label({ text: columnLabels[4] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[4]}}` })
                            });
                            oColumnActivestate.data({ fieldName: keys[4] });
                            oTable.addColumn(oColumnActivestate);

                            // 참조값
                            var oColumnReferencevalue = new UIColumn({
                                label: new Label({ text: columnLabels[5] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[5]}}` })
                            });
                            oColumnReferencevalue.data({ fieldName: keys[5] });
                            oTable.addColumn(oColumnReferencevalue);
                        }
                    }
        
                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        var cells = keys.map(function (key, index) {
                            return new Label({ text: `{${modelName}>${key}}` });
                        });
        
                        oTable.bindAggregation("items", {
                            path: `${modelName}/`,
                            template: new ColumnListItem({
                                cells: cells
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
        
                        columnLabels.forEach(function (label) {
                            oTable.addColumn(new MColumn({ header: new Label({ text: label }) }));
                        });
                    }
        
                    oDialogSuggestions.update();
                }.bind(this));
        
                if (this.byId(inputId)) {
                    this.oMultiInputSuggestion = this.byId(inputId);
                } else {
                    MessageBox.error(`MultiInput의 ID '${inputId}'를 찾을 수 없습니다.`);
                }
        
                if (this.oMultiInputSuggestion) {
                    oDialogSuggestions.setTokens(this.oMultiInputSuggestion.getTokens());
                }
                // 데이터 속성으로 filterPaths 전달
            oDialogSuggestions.data("filterPaths", filterPaths);
                oDialogSuggestions.open();
            }.bind(this));
            this.initializeValueHelpInputs();
        },

        onPageVHOk: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
            console.log("at",aTokens);
			this.oMultiInputSuggestion.setTokens(aTokens);

			 // 생산 순위 내역 및 우선 순위 내역 input 데이터 추가
             if(this.oMultiInputSuggestion.getId().includes("prodLvlVH")){
                var RidToken = this.byId("prodLvlVH").getTokens();
                var inputText;
                var oModel = this.getModel("prodLvlModel");
                var aData = oModel.getProperty("/");
                for (var i = 0; i < aData.length; i++) {
                    for (var j = 0; j < RidToken.length; j++) {
                        var sKey = RidToken[j].getKey();
                        if (aData[i]["Referencecodeid"] === sKey) {
                            inputText = aData[i]["Description"];
                            break;
                        }
                    }
                }
                var oInput = this.byId("prodDescription");
                oInput.setValue(inputText);
            }
            if(this.oMultiInputSuggestion.getId().includes("schedPriVH")){
                var RidToken = this.byId("schedPriVH").getTokens();
                var inputText;
                var oModel = this.getModel("schedPriModel");
                var aData = oModel.getProperty("/");
                for (var i = 0; i < aData.length; i++) {
                    for (var j = 0; j < RidToken.length; j++) {
                        var sKey = RidToken[j].getKey();
                        if (aData[i]["Referencecodeid"] === sKey) {
                            inputText = aData[i]["Description"];
                            break;
                        }
                    }
                }
                var oInput = this.byId("schedDescription");
                oInput.setValue(inputText);
            }

			this.vhdSuggestions.close();
		},

		onPageVHCancel: function () {
			this.vhdSuggestions.close();
		},        

        onPageVHClose: function () {
			this.vhdSuggestions.destroy();
		},

        onPageVHSearch: function (oEvent) {
            // 데이터 속성에서 filterPaths 가져오기
            var filterPaths = this.vhdSuggestions.data("filterPaths");
        
            // SearchField의 검색어와 선택된 필터들을 가져오기
            var sSearchQuery = this.oSearchSuggestion.getValue();
            var aSelectionSet = oEvent.getParameter("selectionSet");
            
            // 필터를 생성
            var aFilters = aSelectionSet ? aSelectionSet.reduce(function (aResult, oControl) {
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }
                return aResult;
            }, []) : [];
        
            // 검색어를 기반으로 필터 추가
            if (sSearchQuery) {
                var searchFilters = filterPaths.map(function (path) {
                    return new Filter({
                        path: path,
                        operator: FilterOperator.Contains,
                        value1: sSearchQuery
                    });
                });
                aFilters.push(new Filter({
                    filters: searchFilters,
                    and: false
                }));
            }
        
            // 필터 적용
            var oVHD = this.vhdSuggestions;
            oVHD.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                }
                if (oTable.bindItems) {
                    oTable.getBinding("items").filter(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                }
                oVHD.update();
            });
        },        

        // suggestion 선택 
        onPageVHSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기
            var sValueHelpId = oMultiInput.getId();
            var contextModel ,contextProperty, sKeyData, sTextData, sId; 
            if(sValueHelpId.includes("materialVH")){
                contextModel = "productModel";
                contextProperty = "Product";

            } else if(sValueHelpId.includes("plantVH")){
                contextModel = "plantModel";
                contextProperty = "Plant";

            } else if(sValueHelpId.includes("prodVerVH")){
                contextModel = "prodVerModel";
                contextProperty = "ProductionVersion";

            } else if(sValueHelpId.includes("prodLvlVH")){
                contextModel = "prodLvlModel";
                contextProperty = "Referencecodeid";
                sKeyData = "Referencecodeid";
                sTextData = "Description";
                sId = "prodDescription";

            } else if(sValueHelpId.includes("schedPriVH")){
                contextModel = "schedPriModel";
                contextProperty = "Referencecodeid";
                sKeyData = "Referencecodeid";
                sTextData = "Description";
                sId = "schedDescription";

            }
            
            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext(contextModel);
                var sKey = oContext.getProperty(contextProperty); // 키 값 가져오기
                var oModel = this.getModel(contextModel);
                var aData = oModel.getProperty("/");

                // 현재 MultiInput에 존재하는 토큰들을 가져오기
                var aExistingTokens = oMultiInput.getTokens();

                // 중복된 토큰이 있는지 확인
                var bTokenExists = aExistingTokens.some(function (oToken) {
                    return oToken.getKey() === sKey;
                });
                
                // 생산 순위 내역 및 우선 순위 내역 input 데이터 추가
                if(contextModel === "prodLvlModel" || contextModel === "schedPriModel"){
                    var inputText;
                    for (var i = 0; i < aData.length; i++) {
                        if (aData[i][sKeyData] === sKey) {
                            inputText = aData[i][sTextData];
                            break;
                        }
                    }
                    var oInput = this.byId(sId);
                    console.log("oInput", oInput);
                    console.log("inputText", inputText);
                    oInput.setValue(inputText);
                }

                // 중복된 토큰이 없을 경우에만 새 토큰을 추가
                if (!bTokenExists) {
                    oMultiInput.addToken(new Token({
                        key: sKey,
                        text: sKey
                    }));
                } else {
                    // 중복된 토큰이 있는 경우, 사용자에게 메시지 표시 (선택 사항)
                    MessageToast.show("이미 추가된 토큰입니다.");
                }

                // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                oMultiInput.setValue("");
            }
        },

        // 포커스 아웃 이벤트 핸들러
        onPageVHFocusOut: function (oEvent) {
            // jQuery 이벤트 객체로부터 ID 가져오기
            var sId = oEvent.target.id;
        
            // ID에 따라 적절한 MultiInput ID 선택
            var inputId;
            if (sId.includes("materialVH")) {
                inputId = "materialVH";
            } else if (sId.includes("plantVH")) {
                inputId = "plantVH";
            } else if (sId.includes("prodVerVH")) {
                inputId = "prodVerVH";
            } else if (sId.includes("prodLvlVH")) {
                inputId = "prodLvlVH";
            } else if (sId.includes("schedPriVH")) {
                inputId = "schedPriVH";
            }
        
            // 해당 ID의 MultiInput 인스턴스 가져오기
            var oMultiInput = this.byId(inputId);
            if(oMultiInput){
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
            }
        },

        onTokenUpdate: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var aTokens = oMultiInput.getTokens();
            if(this.selectedSalesOrder===0){
                var salesItemToken = this.byId("salesOrderItemVH").setTokens([]);
                console.log("sit",salesItemToken);
            }
            // 단일 토큰만 허용하도록 설정
            if (aTokens.length > 0) {
                oMultiInput.removeAllTokens();
                MessageToast.show("하나의 항목만 입력할 수 있습니다.");
            }
        },

        // value help 끝

         // 오더 유형 타입 내역 데이터
         getMfgOrderTypeName: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey(); // 선택된 ManufacturingOrderType
            var oMfgOrderModel = this.getModel("mfgOrderModel");
            var aData = oMfgOrderModel.getProperty("/"); // 모델의 전체 데이터 배열
            
            // 선택된 ManufacturingOrderType에 해당하는 이름 찾기
            var sManufacturingOrderTypeName = "";
            for (var i = 0; i < aData.length; i++) {
                if (aData[i].ManufacturingOrderType === sSelectedKey) {
                    sManufacturingOrderTypeName = aData[i].ManufacturingOrderTypeName;
                    break;
                }
            }
            console.log("sManufacturingOrderTypeName",sManufacturingOrderTypeName);
            // Input 필드에 ManufacturingOrderTypeName 설정
            var oInput = this.byId("mfgOrderTypeName"); 
            oInput.setValue(sManufacturingOrderTypeName);
            console.log("oi",oInput);
        },

        // 메인 페이지 이동
		onCancel: function () {
            this.setModelData();
			this.navTo("Main",{});
		}
    });
});