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

    return Controller.extend("dinewkorder.controller.PageSO", {
        onInit: function () {
			this.getRouter().getRoute("PageSO").attachMatched(this._onRouteMatched, this);

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
                "productVH", "plantVH", "prodVerVH", "salesOrderVH", "prodLvlVH", 
                "schedPriVH", "salesOrderItemVH", "materialVH", "plantVH", "mfgOrderType", "mfgOrderTypeName", 
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
                    if (modelName === "mfgOrderModel") { // 오더유형
                        var filteredData = Array.isArray(commonData) ? 
                        commonData.filter(function(item) {
                            return item.ManufacturingOrderType === "DN01"; // 수주
                        }) : [];
                    
                        // 필터링된 데이터로 JSON 모델 생성
                        var oModel = new JSONModel(filteredData);
                        this.setModel(oModel, modelName);

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
                    } else {
                        var oModel = new JSONModel(commonData);
                        this.setModel(oModel, modelName);
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
            commonModelData("/ProdOrder", "dataModel");
            rankModelData("/ProdLvl", "prodLvlModel");
            rankModelData("/SchedPri", "schedPriModel");

            
        },

        // MultiInput 초기화 및 설정
        initializeValueHelpInputs: function() {
        this.aMultiInputs = ["materialVH", "plantVH", "prodVerVH", "salesOrderVH", "prodLvlVH", "schedPriVH", "salesOrderItemVH"];
    
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
            if (sValueHelpId.includes("prodVerVH")) {
                filterName = "ProductVerVH";
                label = "생산 버전";
                keys = ["ProductionVersion", "Material", "Plant", "ProductionVersionText"];
                modelName = "prodVerModel";
                columnLabels = ["생산 버전", "제품", "플랜트", "생산 버전명"];
                inputId = "prodVerVH";
                filterPaths = ["ProductionVersion", "Material", "Plant", "ProductionVersionText"];

            } else if (sValueHelpId.includes("salesOrderVH") || sValueHelpId.includes("salesOrderItemVH")) {
                filterName = "SalesOrderVH";
                keys = ["SalesOrder", "SalesOrderItem", "Material", "Plant", "OrderQuantity", "OrderQuantityUnit"];
                modelName = "soModel";
                columnLabels = ["판매 문서", "판매 문서 품목", "제품", "플랜트", "판매문서 수량", "판매문서 수량 단위"];
                if(sValueHelpId.includes("salesOrderVH")){
                    label = "판매 문서";
                    inputId = "salesOrderVH";
                } else {
                    label = "판매 문서 품목";
                    inputId = "salesOrderItemVH";
                }
                filterPaths = ["SalesOrder", "SalesOrderItem", "Material", "Plant", "OrderQuantity", "OrderQuantityUnit"];

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
            var keyId = sValueHelpId.includes("salesOrderItemVH") ? keys[1] : (sValueHelpId.includes("prodLvlVH") || sValueHelpId.includes("schedPriVH") ? keys[2] : keys[0]);
            console.log("key",keyId);
            this.oSuggestion = new MultiInput();
            this.oSearchSuggestion = new SearchField();
        
            this.dialogSuggestion = this.loadFragment({
                name: `dinewkorder.view.Fragments.${filterName}`
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar();

                oDialogSuggestions.setKey(keyId);

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
                console.log("key",keyId);
                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this.oSearchSuggestion);
        
                // 기본 검색이 실행될 때 FilterBar 검색 트리거
                this.oSearchSuggestion.attachSearch(function () {
                    oFilterBar.search();
                }.bind(this));
        
                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel(modelName));

                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                         // 필터링 적용
                    if (sValueHelpId.includes("salesOrderItemVH")) {
                        console.log("this.selectedSalesOrder",this.selectedSalesOrder);
                        oTable.bindAggregation("rows", {
                            path: `${modelName}>/`,
                            filters: [new Filter("SalesOrder", FilterOperator.EQ, this.selectedSalesOrder)],
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                    } else {
                        oTable.bindAggregation("rows", {
                            path: `${modelName}>/`,
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                    }
                        if (filterName === "ProductVerVH") {
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

                        } else if (filterName === "SalesOrderVH") {
                            // 판매 문서
                            var oColumnSalesOrder = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnSalesOrder.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnSalesOrder);

                            // 판매 문서 품목
                            var oColumnSalesOrderItem = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnSalesOrderItem.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnSalesOrderItem);
                            
                            // 제품
                            var oColumnMaterial = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnMaterial.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnMaterial);

                            // 플랜트
                            var oColumnPlant = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnPlant.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnPlant);
                            
                            // 판매문서 수량
                            var oColumnOrderQuantity = new UIColumn({
                                label: new Label({ text: columnLabels[4] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[4]}}` })
                            });
                            oColumnOrderQuantity.data({ fieldName: keys[4] });
                            oTable.addColumn(oColumnOrderQuantity);

                            // 판매문서 수량 단위
                            var oColumnOrderQuantityUnit = new UIColumn({
                                label: new Label({ text: columnLabels[5] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[5]}}` })
                            });
                            oColumnOrderQuantityUnit.data({ fieldName: keys[5] });
                            oTable.addColumn(oColumnOrderQuantityUnit);
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
                    var oMultiInput = this.byId("salesOrderItemVH");

                    if(oMultiInput){
                        oMultiInput.getBinding("suggestionRows").filter(new Filter("SalesOrder", FilterOperator.EQ, this.selectedSalesOrder));
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
			this.oMultiInputSuggestion.setTokens(aTokens);

            if (this.oMultiInputSuggestion.getId().includes("salesOrderVH")) {
                this.selectedSalesOrder = aTokens.map(function (token) {
                    return token.getKey(); // 선택된 판매 문서 값
                });
                if(this.selectedSalesOrder){
                    this.byId("salesOrderItemVH").setTokens([]);
                    this.byId("materialVH").setValue("");
                    this.byId("plantVH").setValue("");
                    this.byId("mfgOrderPlannedTotalQty").setValue("");
                }
            }

             // 판매 문서 제품, 플랜트 설정
             if (this.oMultiInputSuggestion.getId().includes("salesOrderItemVH")) {
                var oModel = this.getModel("soModel");
                var aData = oModel.getProperty("/");
                var soTokens = this.selectedSalesOrder; // 선택된 판매 주문 토큰 배열
                var materialText = "";
                var plantText = "";
                var mfgQtyText = 0;
                var aSalesOrderItemTokens = this.byId("salesOrderItemVH").getTokens();
        
                // 모델 데이터에서 일치하는 항목을 찾기
                for (var i = 0; i < aData.length; i++) {
                    if (soTokens.includes(aData[i]["SalesOrder"])) {
                        for (var j = 0; j < aSalesOrderItemTokens.length; j++) {
                            var sKey = aSalesOrderItemTokens[j].getKey();
                            if (aData[i]["SalesOrderItem"] === sKey) {
                                materialText = aData[i]["Material"]; // 첫 번째 텍스트 데이터
                                plantText = aData[i]["Plant"];    // 두 번째 텍스트 데이터
                                mfgQtyText = parseFloat(aData[i]["OrderQuantity"] || 0);
                                break;
                            }
                        }
                        if (materialText && plantText && mfgQtyText) break; // 일치하는 항목을 찾으면 종료
                    }
                }
                 // 기생성된 작업 지시 수량 가져오기
                var oDataModel = this.getModel("dataModel").getData();
                var mfgQtydata = 0; // 초기화
                 
                 // 데이터 모델에서 기 생성된 작업 지시 수량을 더합니다.
                oDataModel.forEach(function(data) {
                     if (data.SalesOrder === soTokens[0] && data.SalesOrderItem === sKey) {
                        mfgQtydata += parseFloat(data.MfgOrderPlannedTotalQty) || 0;
                     }
                });
                 
                // mfgQtydata를 this.mfgQtydata로 저장하여 사용
                this.mfgQtydata = mfgQtydata;
                
                // 두 개의 입력 필드에 값 설정
                var oMaterialInput = this.byId("materialVH");
                var oPlantInput = this.byId("plantVH");
                var oMfgQtyInput = this.byId("mfgOrderPlannedTotalQty");
                if (oMaterialInput) {
                    oMaterialInput.setValue(materialText || ""); // 값이 없으면 빈 문자열로 설정
                }
                
                if (oPlantInput) {
                    oPlantInput.setValue(plantText || ""); // 값이 없으면 빈 문자열로 설정
                }

                if (oMfgQtyInput) {
                    oMfgQtyInput.setValue(mfgQtyText ? (mfgQtyText - this.mfgQtydata) || 0 : 0); // 값이 없으면 빈 문자열로 설정
                }
            }

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
            console.log("osi",oSelectedItem);
            var sValueHelpId = oMultiInput.getId();
            var contextModel ,contextProperty, sKeyData, sTextData, sId; 
            if(sValueHelpId.includes("prodVerVH")){
                contextModel = "prodVerModel";
                contextProperty = "ProductionVersion";

            } else if(sValueHelpId.includes("salesOrderVH") || sValueHelpId.includes("salesOrderItemVH")){
                contextModel = "soModel";
                if(sValueHelpId.includes("salesOrderVH")){
                    contextProperty = "SalesOrder";
                } else {
                    contextProperty = "SalesOrderItem";
                    sKeyData = "SalesOrderItem";
                    sTextData = ["Material","Plant", "OrderQuantity"];
                    sId = ["materialVH", "plantVH", "mfgOrderPlannedTotalQty"];
                }
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

                    // 판매 문서 제품, 플랜트 설정
                    if (contextProperty === "SalesOrderItem") {
                        var soTokens = this.selectedSalesOrder; // 선택된 판매 주문 토큰 배열
                        var materialText = "";
                        var plantText = "";
                        var mfgQtyText = "";
                
                        // 모델 데이터에서 일치하는 항목을 찾기
                        for (var i = 0; i < aData.length; i++) {
                            if (soTokens.includes(aData[i]["SalesOrder"])) {
                                if (aData[i][sKeyData] === sKey) {
                                    materialText = aData[i][sTextData[0]]; // 첫 번째 텍스트 데이터
                                    plantText = aData[i][sTextData[1]];    // 두 번째 텍스트 데이터
                                    mfgQtyText = aData[i][sTextData[2]];
                                   
                                    break;
                                }
                            }
                        }
                
                        // 두 개의 입력 필드에 값 설정
                        var oMaterialInput = this.byId(sId[0]);
                        var oPlantInput = this.byId(sId[1]);
                        var oMfgQtyInput = this.byId(sId[2]);
                
                        if (oMaterialInput) {
                            oMaterialInput.setValue(materialText || ""); // 값이 없으면 빈 문자열로 설정
                        }
                
                        if (oPlantInput) {
                            oPlantInput.setValue(plantText || ""); // 값이 없으면 빈 문자열로 설정
                        }

                        if (oMfgQtyInput) {
                            oMfgQtyInput.setValue(mfgQtyText || ""); // 값이 없으면 빈 문자열로 설정
                        }
                    }
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
            if (sId.includes("prodVerVH")) {
                inputId = "prodVerVH";
            } else if (sId.includes("salesOrderVH")) {
                inputId = "salesOrderVH";
            } else if (sId.includes("prodLvlVH")) {
                inputId = "prodLvlVH";
            } else if (sId.includes("schedPriVH")) {
                inputId = "schedPriVH";
            } else if (sId.includes("salesOrderItemVH")) {
                inputId = "salesOrderItemVH";
            } 
        
            // 해당 ID의 MultiInput 인스턴스 가져오기
            var oMultiInput = this.byId(inputId);
            if(oMultiInput){
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
            }
        },

        // 토큰 삭제 될 때 기존 값 삭제하기 
        onTokenDelete: function (oEvent) {
            // 삭제된 토큰의 정보를 가져옵니다
            var oToken = oEvent.getParameter("token");
        
            // MultiInput의 ID를 확인하여 필요한 필드의 값을 지우기
            var sMultiInputId = this.oMultiInputSuggestion.getId();
            if (sMultiInputId.includes("salesOrderItemVH")) {
                var oMaterialInput = this.byId("materialVH");
                var oPlantInput = this.byId("plantVH");
              
                if (oMaterialInput) {
                    oMaterialInput.setValue("");
                }
                if (oPlantInput) {
                    oPlantInput.setValue("");
                }
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

        // 저장
        onSave: function () {
            var oMainModel = this.getOwnerComponent().getModel("mainData");
            var lotSize = this.byId("lotSize").getValue();
            var oData = {
                SalesOrder: this.byId("salesOrderVH").getTokens().map(function(token) { return token.getKey(); })[0] || "", // 판매 문서
                SalesOrderItem: this.byId("salesOrderItemVH").getTokens().map(function(token) { return token.getKey(); })[0] || "", // 판매 문서 내역
                ManufacturingOrderType: this.byId("mfgOrderType").getSelectedKey(), // 오더 유형
                Material: this.byId("materialVH").getValue(),
                ProductionPlant: this.byId("plantVH").getValue(), // 플랜트
                TotalQuantity: this.byId("mfgOrderPlannedTotalQty").getValue(), // 작업 수량
                ProductionVersion: this.byId("prodVerVH").getTokens().map(function(token) { return token.getKey(); })[0] || "", // 생산 버전
                MfgOrderPlannedStartDate: this.byId("startDate").getDateValue(), // 기본 시작일
                YY1_PROD_RANK_ORD: this.byId("prodLvlVH").getTokens().map(function(token) { return token.getKey(); })[0] || "", // 생산 순위
                YY1_PRIO_RANK_ORD: this.byId("schedPriVH").getTokens().map(function(token) { return token.getKey(); })[0] || "", // 우선 순위
                YY1_PROD_TEXT_ORD: this.byId("prodAnnotaion").getValue() // 생산 주석 (Input 컨트롤)
            };
        
            console.log("odata", oData);
        
            // 데이터 유효성 검사 (예시: 필수 입력값 체크)
            if (!oData.SalesOrder || !oData.SalesOrderItem || !oData.ManufacturingOrderType || !oData.TotalQuantity || !oData.MfgOrderPlannedStartDate) {
                MessageBox.error("필수 값을 입력해주세요.");
                return;
            }

            var sSalesOrder = oData.SalesOrder;
            var sSalesOrderItem = oData.SalesOrderItem;
            var sMfgQty = parseFloat(oData.TotalQuantity);

            //판매 문서 수량 가져오기
            var oSoModel = this.getModel("soModel").getData();
            oSoModel.forEach(function(sdata){
                if(sdata.SalesOrder === sSalesOrder && sdata.SalesOrderItem === sSalesOrderItem){
                        this.mfgQty = parseFloat(sdata.OrderQuantity);
                }
            }.bind(this));

            // 기생성된 작업 지시 수량 가져오기
            var oDataModel = this.getModel("dataModel").getData();
                var mfgQtydata = 0; // 초기화
                 
            // 데이터 모델에서 기 생성된 작업 지시 수량을 더합니다.
            oDataModel.forEach(function(data) {
                    if (data.SalesOrder === sSalesOrder && data.SalesOrderItem === sSalesOrderItem) {
                    mfgQtydata += data.MfgOrderPlannedTotalQty || 0;
                    }
            });
                
            // mfgQtydata를 this.mfgQtydata로 저장하여 사용
            this.mfgQtydata = parseFloat(mfgQtydata);
            console.log("this",this.mfgQtydata);

            if (lotSize && lotSize >= 0) {
                // 작업지시 수량 계산
                var mfgData = this.mfgQty - this.mfgQtydata; // 판매문서 수량 - 기 생성된 작업지시 수량 합계
                
                // 입력된 작업지시 수량이 판매문서 수량보다 많지 않은지 확인
                if (lotSize <= sMfgQty) { 
                        if(sMfgQty <= mfgData){ // 입력된 작업지시 수량 = (판매문서/품목의 수량 - 기생성된 생산오더 수량 합계)
                            
                            var numOrders = Math.floor(sMfgQty / lotSize); // 로트 사이즈로 나누어진 작업 지시 수량
                            var remainderQty = sMfgQty % lotSize; // 나머지 수량
                            console.log("reqty",remainderQty);
                            var oDataArray = []; // 생성할 작업지시 데이터를 담을 배열

                            // 로트 사이즈로 나누어진 작업지시 데이터 생성
                            for (var i = 0; i < numOrders; i++) {
                                oDataArray.push({
                                    MfgOrderType: "1",
                                    SalesOrder: sSalesOrder,
                                    SalesOrderItem: sSalesOrderItem,
                                    ManufacturingOrderType: oData.ManufacturingOrderType,
                                    MfgOrderPlannedTotalQty: lotSize,
                                    ProductionVersion: oData.ProductionVersion,
                                    MfgOrderPlannedStartDate: oData.MfgOrderPlannedStartDate,
                                    Yy1ProdRankOrd: oData.Yy1ProdRankOrd,
                                    Yy1PrioRankOrd: oData.Yy1PrioRankOrd,
                                    Yy1ProdText: oData.Yy1ProdText
                                });
                            }

                            // 나머지 수량이 있는 경우 추가 작업지시 데이터 생성
                            if (remainderQty > 0) {
                                oDataArray.push({
                                    MfgOrderType: "1",
                                    SalesOrder: sSalesOrder,
                                    SalesOrderItem: sSalesOrderItem,
                                    ManufacturingOrderType: oData.ManufacturingOrderType,
                                    MfgOrderPlannedTotalQty: remainderQty.toString(),
                                    ProductionVersion: oData.ProductionVersion,
                                    MfgOrderPlannedStartDate: oData.MfgOrderPlannedStartDate,
                                    Yy1ProdRankOrd: oData.Yy1ProdRankOrd,
                                    Yy1PrioRankOrd: oData.Yy1PrioRankOrd,
                                    Yy1ProdText: oData.Yy1ProdText
                                });
                            }

                            console.log("oda",oDataArray);

                            var oWorkOrderAPI = this.getModel("WorkOrderAPI");
                                var sEntitySet = "/A_ProductionOrder_2"; 
                                var Status = "";
                                var Message = "";
                                oWorkOrderAPI.create(sEntitySet, oData, {
                                    
                                    success: function (oResponse) {
                                        oDataArray.map(function (){
                                            Status = "1";
                                            Message = oResponse;
                                         }.bind(this));
                                    },
                                    error: function (oError) {
                                        // 요청 실패 후 처리
                                        oDataArray.map(function (){
                                          Status = "2";
                                          Message = oError;
                                        }.bind(this));
                                    }
                                });
                            
                            // OData 모델을 사용하여 데이터 저장
                            var promises = oDataArray.map(function(data) {
                                return this._getODataCreate(oMainModel, "/ProdOrder", data);
                            }.bind(this));

                            // 모든 데이터 저장 시 성공/실패 처리
                            Promise.all(promises).then(function() {
                                MessageBox.success("작업 지시 생성에 성공하였습니다.");
                            }.bind(this)).catch(function() {
                                MessageBox.error("작업 지시 생성에 실패하였습니다.");
                            }.bind(this));
                            this.navTo("Main", {});
                        } else if (sMfgQty > mfgData) { // 입력된 작업지시 수량 > (판매문서/품목의 수량 - 기생성된 생산오더 수량 합계)
                          
                            MessageBox.error("작업지시 수량은 (판매 문서의 수량 - 기생성된 생산 오더의 수량)보다 작아야 합니다.");
                        }

                    } else if (lotSize > sMfgQty) { 
                    
                        MessageBox.error("로트 사이즈가 입력된 작업 지시 수량보다 큽니다.");

                } else if (lotSize < 0) { // 로트 사이즈가 0보다 작은지 확인
                    MessageBox.error("로트 사이즈는 0 이거나 0 보다 커야합니다.");
                }
            } else {
                MessageBox.error("로트 사이즈는 0 이거나 0 보다 커야합니다.");
            }
        },        

        // 메인 페이지 이동
		onCancel: function () {
            this.setModelData();
			this.navTo("Main",{});
		}
    });
});