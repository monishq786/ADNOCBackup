sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "adnoc/vi/vehicleinspection/modone/constants/Constant",
    "adnoc/vi/vehicleinspection/modone/formatter/Formatter",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageBox, MessageToast, Constant, Formatter, Fragment) {
    "use strict";

    return Controller.extend("adnoc.vi.vehicleinspection.modone.fragment.controller.FRGComprehensiveTestController", {

   // ---------------- Fragment Root ----------------
        setFragmentRoot: function (oRoot) {
            this._oFragmentRoot = oRoot;
            if (typeof this.onAfterFragmentLoad === "function") {
                this.onAfterFragmentLoad();
            }
        },

        getFragmentRoot: function () {
            return this._oFragmentRoot;
        },

        // Called after fragment is loaded
        onAfterFragmentLoad: function () {
            const oRoot = this.getFragmentRoot();
            if (oRoot && !this._eventAttached) {
                oRoot.attachEvent("loadData", this.onBtnPressESMATest, this);
                this._eventAttached = true;
            }

            // ✅ Define fragment-level variable using VIRGlobalModel data
            this.charStatusData = this.getFragmentRoot()
                ?.getModel("VIRGlobalModel")
                ?.getProperty("/VisualSelectRowData");
        },

        setParentController: function (oController) {
            this._parentController = oController;
        },

        getParentController: function () {
            return this._parentController;
        },

        setParentModels: function (models) {
            this._parentModels = models;
            Object.keys(models).forEach(name => {
                this.getFragmentRoot()?.setModel(models[name], name);
            });
        },

        getParentModel: function (name) {
            return this._parentModels?.[name] || null;
        },


        //#region ComprehensiveRegion

        /**Function to open the fragment comprehensive test 
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires fetchComprehensiveData,onLoadAfterSaveFetchComprehensiveData,createModeForComprehensive
         */
        onBtnPressComprehensiveTest: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;

            const oOrderProcessingModelBase = oRoot.getModel("aOrderProcessingModelBase");
            if (!oOrderProcessingModelBase) {
                MessageBox.warning(this._getText("comprehensive_messageWarning"));
                return;
            }

            if (!oRoot.getModel("aOrderProcessingModel")) {
                oRoot.setModel(oOrderProcessingModelBase, "aOrderProcessingModel");
            }

            let sApplicableCom = this._getText("ServiceTest_ApplicableCom");
            let aUpdatedData = oRoot.getModel('aOrderProcessingModel').getData();
            let oCharStatusList = this.charStatusData
            let aFetchedComprehensiveData;
            if (!oCharStatusList) {
                oCharStatusList = oRoot.getModel('VisibleButtonClickedDataModel').getData();
            }
            oCharStatusList = aUpdatedData.Data.find(Item => {
                return Item.vehOrdInspLines.results.filter(SunItem => { SunItem.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines })
            });

            const oFilteredResults = oCharStatusList.vehOrdInspLines.results.flatMap(HeaderLine => {
                return HeaderLine.vehOrdInspLinesTestChars.results.filter(
                    item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE
                );
            });

            const vehicleOrderGuid = oFilteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE)
                .map(item => ({
                    testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
                    testStatus: item.testStatus,
                    applicableTestName: item.applicableTestName,
                    testInspectedBy: item.testInspectedBy,
                    testInspectionEndDate: item.testInspectionEndDate,
                    testInspectionStartDate: item.testInspectionStartDate,
                    testResApprovalHistories: item.testResApprovalHistories

                }));
            if (vehicleOrderGuid.length <= 0) {
                MessageBox.warning(sApplicableCom);
                return
            }
            if ((vehicleOrderGuid[0].testStatus != Constant.STATUS.OPEN)) {
                let oCreateByObject = {
                    testInspectedBy: vehicleOrderGuid[0].testInspectedBy,
                    testInspectionEndDate: Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(vehicleOrderGuid[0].testInspectionEndDate),
                    testInspectionStartDate: Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(vehicleOrderGuid[0].testInspectionStartDate),
                }
                let CreatedByObjectModel = new JSONModel(oCreateByObject);
                oRoot.setModel(CreatedByObjectModel, 'CreatedByObjectModel');
            }


            if (vehicleOrderGuid[0].testStatus == Constant.STATUS.OPEN) {
                aFetchedComprehensiveData = await this.fetchComprehensiveData();
            } else {
                aFetchedComprehensiveData = await this.onLoadAfterSaveFetchComprehensiveData(vehicleOrderGuid[0].testUUID);

            }
            let isApproval = oCharStatusList.vehOrdInspLines.results.some(Item => Item.VI_APPROVAL === Constant.TESTTYPE.APPROVAL);
            let oGlobalModel = oRoot.getModel('oGlobalModel');
            let oLoginRoleType = oGlobalModel.oData.EmployeeData.empRole;
            if (oLoginRoleType === Constant.APPROVALROLE.SUPERVISOR) {
                isApproval = false
            }

            if (vehicleOrderGuid.find(Item => true).testResApprovalHistories.results.length > 0) {
                oGlobalModel.setProperty("/isAppHistoryComBtnShow", true);
            } else {
                oGlobalModel.setProperty("/isAppHistoryComBtnShow", false);
            }
            if (vehicleOrderGuid[0].testStatus === Constant.STATUS.FAIL || vehicleOrderGuid[0].testStatus === Constant.STATUS.COMPLETE || vehicleOrderGuid[0].testStatus === Constant.STATUS.PENDING) {
                oGlobalModel.setProperty("/isButtonVisibleSave", false);
                oGlobalModel.setProperty("/isRadioButton", false);
                oGlobalModel.setProperty("/ischeckBox", false);
                oGlobalModel.setProperty("/isBtnVisibleConfirm", false);
                oGlobalModel.setProperty("/isButtonVisibleApproval", false);
                oGlobalModel.setProperty("/isbtnAndCheckBox", false);
            } else {
                oGlobalModel.setProperty("/isButtonVisible", true);
                oGlobalModel.setProperty("/isRadioButton", true);
                oGlobalModel.setProperty("/ischeckBox", false);
                oGlobalModel.setProperty("/isButtonVisibleApproval", isApproval);
                oGlobalModel.setProperty("/isBtnVisibleConfirm", !isApproval);
                oGlobalModel.setProperty("/isButtonVisibleSave", true);
                oGlobalModel.setProperty("/isbtnAndCheckBox", true);
            }
            if (aFetchedComprehensiveData.length > 0) {
                let oData = { responseArray: aFetchedComprehensiveData.filter(Item => true) };
                let oModel = new JSONModel(oData);
                oRoot.setModel(oModel, "aComprehensiveModel");

                this.createModeForComprehensive(aFetchedComprehensiveData);
            } else {
                let oData = { responseArray: aFetchedComprehensiveData.aResponseArray };
                let oModel = new JSONModel(oData);
                oRoot.setModel(oModel, "aComprehensiveModel");

                this.createModeForComprehensive(aFetchedComprehensiveData.aResponseArray);
            }
            oRoot.getModel("aComprehensiveModel").setProperty(`/testComments`, oFilteredResults[0].testComments);
           
            let comprehensiveModel = oRoot.getModel('aComprehensiveModel');
            if (this.aHoldDataExpended) {
                if (this.aHoldDataExpended.length > 0) {
                    this.aHoldDataExpended.forEach(Item => {
                        if (Item.IsVisible) {
                            comprehensiveModel.setProperty(Item.Path + '/isShowPended', Item.IsVisible);
                            comprehensiveModel.setProperty(Item.Path + '/isShowArabic', false);
                        }
                    });
                };
            }
            //#endregion
        },


        /**Function to create payload for the comprehensive test
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires
         */
        generateComprehensiveResultPayload(oSharePayload) {

            if (!oSharePayload)
                return MessageToast.show(this._getText("orderProcessing_Valid_PayloadNull"));
            let aPayload = []
            oSharePayload.responseArray.forEach(parent => {
                parent.SubCategory.forEach(subCategory => {
                    subCategory.ChildSubCategory = subCategory.ChildSubCategory.filter(child => child.Selected === true);
                });
            });
            oSharePayload.responseArray.forEach(Item => {
                Item.SubCategory.forEach((SubItem, Index) => {
                    let oData = {
                        testMainTypeSrNo: Index + 1,
                        vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: null,
                        testMainTypeNo: Item.testMainTypeNo,
                        testMainTypeTextEnglish: Item.testMainType,
                        examinationMethodEnglish: Item.examinationMethodEnglish,
                        examinationMethodArabic: Item.examinationMethodArabic,
                        controlTypeValueLabel1: Item.controlTypeValueLabel1,
                        controlTypeValueLabel2: Item.controlTypeValueLabel2,
                        testMainTypeTextArabic: Item.testMainTypeTextArabic,
                        testMainTypeTextArabic: Item.testMainTypeTextArabic,
                        testSubTypeTextEnglish: SubItem.testSubTypeTextEnglish,
                        testSubTypeTextArabic: SubItem.testSubTypeTextArabic,
                        controlTypeValueLabel1Flag: SubItem.controlTypeValueLabel1 ?? false,
                        controlTypeValueLabel2Flag: SubItem.controlTypeValueLabel2 ?? false,
                        conditionalMappingMasterCode: SubItem.conditionalMappingMasterCode,
                        compResSubTypesText: SubItem.compResSubTypesText,
                        compResSubTypes: []

                    }

                    if (SubItem.conditionalMappingMasterCode === Constant.MATERIALCODE.MaterialCodeVHPT) {
                        SubItem.ChildSubCategory.forEach(deepChild => {
                            let oDeepChild = {
                                testTypeTextEnglish: deepChild.testTypeTextEnglish,
                                testTypeTextArabic: deepChild.testTypeTextArabic,
                                testTypeKey: null
                            }
                            oData.compResSubTypes.push(oDeepChild);
                        });

                    } else {
                        let oDeepChild = {
                            testTypeTextEnglish: SubItem.compResSubTypesText,
                            testTypeTextArabic: null,
                            testTypeKey: null

                        }
                        oData.compResSubTypes.push(oDeepChild);
                    }
                    aPayload.push(oData);

                });
            });

            const oFinalPayload = {
                applicableTestName: null,
                testComments: oSharePayload.testComments,
                testInspectedBy: null,
                testInspectionEndDate: null,
                testInspectionStartDate: null,
                testStatus: null,
                vehicleOrderInspectionLines_vehicleOrderInspectionLines: oSharePayload.vehicleOrderInspectionLines_vehicleOrderInspectionLines,
                testResComps: aPayload
            };
            return oFinalPayload;
        },

        /**Function to delete data from the comprehensive test
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires
         */
        deleteComprehensiveResults: async function (oPayload, sVehicleGUID) {
            const oRoot = this.getFragmentRoot();
            const oPayloadCom = {
                applicableTestName: oPayload.applicableTestName,
                testComments: null,
                testInspectedBy: oPayload.testInspectedBy,
                testInspectionEndDate: oPayload.testInspectionEndDate,
                testInspectionStartDate: oPayload.testInspectionStartDate,
                testStatus: oPayload.testStatus,
                testResComps: null
            };
            await this._parentController.createNewModelUsingAPI(
                Constant.PATCH,
                `/VehicleOrderInspectionLinesTestChar('${sVehicleGUID}')`,
                oPayloadCom,
                'ComprehensiveDataModelFordelete'
            );
            const aInsertedDataModel = oRoot.getModel("ComprehensiveDataModelFordelete");
            oRoot.setModel(aInsertedDataModel, "InsertedDataModel");
        },


        /**Function to fetch data for the comprehensive test Result 
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires
         */
        fetchComprehensiveData: async function () {
            const oRoot = this.getFragmentRoot();
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                '/fetchComprehensiveData',
                '',
                'ComprehensiveDataModel'
            );
            let oModel = oRoot.getModel('ComprehensiveDataModel').getData();
            let aComprehensiveData = oModel.fetchComprehensiveData;
            return aComprehensiveData;
        },

        /**Function to close fragment for the comprehensive test Result 
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires
         */
        onBtnPressCloseComprehensive: function () {
            if (this.Comprehensivefrag) {
                this.Comprehensivefrag.close();
            }
        },

        /**Function use when the radio button is selected from comprehensive Test
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires
         */
        onBtnPressPaintedOption: function (oEvent) {
            let sValidation = this._getText("validComprehensivePainted");
            let oRadioButton = oEvent.getSource();
            let oContext = oRadioButton.getBindingContext("aComprehensiveModel");
            if (!oContext) {

                return;
            }
            let oData = oContext.getObject();
            if (oRadioButton.getSelected()) {
                if (oRadioButton.getId().includes(Constant.PAINTED.Painted)) {
                    oData.Painted = true;
                    oData.NonPainted = false;

                } else if (oRadioButton.getId().includes(Constant.PAINTED.NotPainted)) {
                    oData.NonPainted = true;
                    oData.Painted = false;
                } else {
                    console.log(sValidation);
                }
                oContext.getModel().setProperty(oContext.getPath(), oData);

            }
        },

        /**"Function to modify the payload data.
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires
         */
        createModeForComprehensive: function (aResData) {
            const oRoot = this.getFragmentRoot();
            let aFormattedData = [];
            aResData.forEach((mainItem, mainIndex) => {

                let oParent = {
                    id: "parent_" + mainIndex,
                    testMainTypeNo: mainItem.testMainTypeNo,
                    testMainType: mainItem.testMainType,
                    testMainTypeTextEnglish: mainItem.testTextNo,
                    testMainTypeTextArabic: mainItem.testMainTypeTextArabic,
                    isParent: true,
                    controlTypeValueLabel1: mainItem.controlTypeValueLabel1,
                    controlTypeValueLabel2: mainItem.controlTypeValueLabel2,
                    controlTypeValueLabel3: mainItem.controlTypeValueLabel3,
                    controlTypeValueLabel4: mainItem.controlTypeValueLabel4,
                    examinationMethodEnglish: mainItem.examinationMethodEnglish,
                    examinationMethodArabic: mainItem.examinationMethodArabic,
                    isShowPended: false,
                    SubCategory: []
                };
                mainItem.SubCategory.forEach((subItem, subIndex) => {
                    let oChild = {
                        id: "child_" + mainIndex + "_" + subIndex,
                        testSubTypeTextEnglish: subItem.testSubTypeTextEnglish,
                        testSubTypeTextArabic: subItem.testSubTypeTextArabic,
                        controlTypeValueLabel1: subItem.controlTypeValueLabel1,
                        controlTypeValueLabel2: subItem.controlTypeValueLabel2,
                        conditionalMappingMasterCode: subItem.conditionalMappingMasterCode,
                        compResSubTypesText: subItem.compResSubTypesText,
                        isParent: false,
                        ChildSubCategory: []
                    };
                    subItem.ChildSubCategory.forEach((childSubItem, subIndex) => {
                        let cChild = {
                            id: "child_" + mainIndex + "_" + subIndex + "_" + subIndex,
                            testTypeNo: childSubItem.testTypeNo,
                            testTypeTextEnglish: childSubItem.testTypeTextEnglish,
                            testTypeTextArabic: childSubItem.testTypeTextArabic,
                            Selected: childSubItem.Selected,

                        };
                        oChild.ChildSubCategory.push(cChild);

                    });
                    oParent.SubCategory.push(oChild);
                });

                aFormattedData.push(oParent);
            });
            let oModel = new JSONModel({ responseArray: aFormattedData });
            oRoot.setModel(oModel, "aComprehensiveModel");

        },


        /**Function used to merge data from TestType to TestTypeResult.
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires generateComprehensiveResultPayload,getDateFromatIn_yyyyMMdd_HH_MM_SS,deleteComprehensiveResults,onBtnPressCloseComprehensive
         */

        onLoadAfterSaveFetchComprehensiveData: async function (ServiceGuid) {
            const oRoot = this.getFragmentRoot();
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                '/fetchComprehensiveData',
                '',
                'MargeDataDelectedOrNot'
            );
            let oModelModify = oRoot.getModel('MargeDataDelectedOrNot');
            let oDataModify = oModelModify.getData();
            let payload = {
                VehicleOrderInspectionLinesTestCharUUID: ServiceGuid
            }
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                '/getTestResultComprehensiveById',
                payload,
                'ComprehensiveDataModel'
            );

            let oModel = oRoot.getModel('ComprehensiveDataModel');
            let oData = oModel.getData();
            let lComprehensiveData = oData.results;

            lComprehensiveData.forEach(item_2 => {
                item_2.SubCategory.forEach(sub_cat_2 => {
                    const test_main_type_no_2 = item_2.testMainTypeNo;
                    const test_main_type_2 = item_2.testMainType;
                    const test_sub_type_text_english_2 = sub_cat_2.testSubTypeTextEnglish;
                    const test_sub_type_text_arabic_2 = sub_cat_2.testSubTypeTextArabic;

                    oDataModify.fetchComprehensiveData.aResponseArray.forEach(main_item => {
                        main_item.SubCategory.forEach(main_sub_cat => {
                            if (
                                main_item.testMainTypeNo == test_main_type_no_2 &&
                                main_item.testMainType == test_main_type_2 &&
                                main_sub_cat.testSubTypeTextEnglish == test_sub_type_text_english_2 &&
                                main_sub_cat.testSubTypeTextArabic == test_sub_type_text_arabic_2
                            ) {

                                main_sub_cat.controlTypeValueLabel1 = sub_cat_2.controlTypeValueLabel1
                                main_sub_cat.controlTypeValueLabel2 = sub_cat_2.controlTypeValueLabel2
                                main_sub_cat.conditionalMappingMasterCode = sub_cat_2.conditionalMappingMasterCode
                                main_sub_cat.compResSubTypesText = sub_cat_2.compResSubTypesText

                                if (main_sub_cat.conditionalMappingMasterCode == Constant.MATERIALCODE.MaterialCodeTEXT) {
                                    if (Array.isArray(main_sub_cat.ChildSubCategory) && main_sub_cat.ChildSubCategory.length === 0) {
                                        main_sub_cat.ChildSubCategory = sub_cat_2.ChildSubCategory
                                    }
                                }
                                sub_cat_2.ChildSubCategory.forEach(child_2 => {
                                    const test_uuid_2 = child_2.testTypeTextEnglish;
                                    main_sub_cat.ChildSubCategory.forEach(main_child => {
                                        if (main_child.testTypeTextEnglish == test_uuid_2) {
                                            main_child.Selected = child_2.Selected;
                                        }

                                    });
                                });
                            }
                        });
                    });
                });
            });

            oModelModify.refresh(true);
            return oModelModify.oData.fetchComprehensiveData.aResponseArray;

        },

        /**Function that contains the save logic for the comprehensive test result.
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires generateComprehensiveResultPayload,getDateFromatIn_yyyyMMdd_HH_MM_SS,deleteComprehensiveResults,onBtnPressCloseComprehensive
         */
        onPressComprehensiveLogic: async function (oEvent) {
            let oBusinessData = Formatter.onLoadGetDataInSessionStorage('BusinessData');
            const oRoot = this.getFragmentRoot();
            let oEmployeeData = Formatter.onLoadGetDataInSessionStorage('BusinessData');


            let sValidComprehensiveUUID = this._getText("Comprehensive_ValidComprehensiveUUID");
            let sButtonId;
            let oButtonData = oEvent.getSource().getCustomData();
            oButtonData.forEach(Item => sButtonId = Item.getKey())
            let aSelectedData = oRoot.getModel("aComprehensiveModel").getData();

            let aPayload = await this.generateComprehensiveResultPayload(aSelectedData);
            let sTestCharUUID = '';
            let dCurrentDate = new Date();
            let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate);

            if (this.charStatusData && this.charStatusData.vehOrdInspLinesTestChars) {
                let aCharStatusList = this.charStatusData;

                const oFilteredResults = aCharStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE);

                const bIsApproval = aCharStatusList.vehOrdInspLinesTestChars.results
                    .some(item => item.applicableTestName === Constant.TESTTYPE.APPROVAL);

                const aVehicleOrderGuid = oFilteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE)
                    .map(item => ({
                        testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
                        testStatus: item.testStatus,
                        applicableTestName: item.applicableTestName,
                        testInspectionEndDate: item.testInspectionEndDate,
                        testInspectionStartDate: item.testInspectionStartDate,

                    }));

                if (aVehicleOrderGuid.length === 0) {
                    console.error(sValidComprehensiveUUID);
                    return;
                }

                sTestCharUUID = aVehicleOrderGuid[0].testUUID;
                aPayload.applicableTestName = aVehicleOrderGuid[0].applicableTestName;
                aPayload.testInspectedBy = oBusinessData.empNameEnglish;
                aPayload.testInspectedByCode = oEmployeeData.empCode;
                aPayload.testInspectedBy = oEmployeeData.empNameEnglish;

                let status = aPayload.testResComps.every(item => item.controlTypeValueLabel2Flag === true) ? Constant.STATUS.COMPLETE : Constant.STATUS.FAIL;//change
                if ((aVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || aVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && (sButtonId === Constant.BUTTONEVENT.BUTTONCOMPREHENSIVESAVE)) {
                    aPayload.testStatus = Constant.STATUS.INPROGRESS;
                } else if ((aVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || aVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && (sButtonId === Constant.BUTTONEVENT.BUTTONCOMPREHENSIVECOM)) {
                    aPayload.testStatus = status;

                    if (bIsApproval && oEmployeeData.empRole == Constant.APPROVALROLE.SUPERVISOR) {
                        const oApprovalHistory = {
                            refDocumentID: sTestCharUUID, // Reference to main document (e.g., PO or Leave)
                            performedByUserId: oEmployeeData.empCode, // Current approver user ID
                            performedByMailAddress: oEmployeeData.empEmailAddress, // Current approver email
                            performedByFullName: oEmployeeData.empNameEnglish, // Current approver full name
                            action: Constant.APPROVALSTATUS.APPROVED,
                            comments: this._getText('SelfApproved'),
                            actionDate: new Date()

                        }
                        this._saveApprovalHistory(oApprovalHistory);
                    }

                } else if ((aVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || aVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && (sButtonId === Constant.BUTTONEVENT.BUTTONCOMPREHENSIVEAPPROVAL)) {
                    aPayload.testStatus = Constant.STATUS.PENDING;
                }
                else {
                    aPayload.testStatus = aVehicleOrderGuid[0].testStatus;
                }
                if (aVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN && aPayload.testStatus == Constant.STATUS.INPROGRESS) {
                    aPayload.testInspectionStartDate = dFormattedDate;
                } else if (aVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS && (aPayload.testStatus == Constant.STATUS.FAIL || aPayload.testStatus == Constant.STATUS.PASS)) {
                    aPayload.testInspectionEndDate = dFormattedDate;
                } else {
                    aPayload.testInspectionEndDate = dFormattedDate;
                    aPayload.testInspectionStartDate = dFormattedDate;
                }
            }
            else {
                MessageToast.show(this._getText("orderProcessing_Valid_undefinedl"));
            }
            await this.deleteComprehensiveResults(aPayload, sTestCharUUID);
            await this._parentController.createNewModelUsingAPI(
                Constant.PATCH,
                `/VehicleOrderInspectionLinesTestChar('${sTestCharUUID}')`,
                aPayload,
                'TestCharSaveModel'
            );
            var oRouter = this.getParentController().getOwnerComponent().getRouter();
            oRouter.navTo(Constant.OrderProcessing, { fromScreen: "VisualScreen" });
            if (sButtonId === Constant.BUTTONEVENT.BUTTONCOMPREHENSIVEAPPROVAL) {
                MessageToast.show(this._getText("Comprehensive_MessageBoxForConfirmApproval"));
            } else {
                MessageToast.show(this._getText("comprehensive_messageToastDataSavedSuccessfully"));
            }
        },

        /**Function that contains the  Comfirm logic for the comprehensive test result.
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires onPressComprehensiveLogic
         */
        onBtnPressConfirmComprehensive: async function (oEvent) {
            try {
                const oRoot = this.getFragmentRoot();
                let sValidComprehensive = this._getText("ValidComprehensive");
                let aSelectedData = oRoot.getModel("aComprehensiveModel").getData();
                let bValid = false;
                aSelectedData.responseArray.filter(Item => {
                    Item.SubCategory.filter(SunItem => {
                        if (SunItem.controlTypeValueLabel1 === false && SunItem.controlTypeValueLabel2 === false) {
                            bValid = true;
                        }
                    })
                })
                if (bValid === true) {
                    MessageBox.warning(sValidComprehensive);
                    return
                }
                MessageBox.confirm(
                    this._getText("salesOrder_messageToastAreyousureyouwanttoConfirm"), {
                    icon: MessageBox.Icon.INFORMATION,
                    title: this._getText("confirm"),
                    class: "sapUiSizeCompact",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.YES) {
                            this.onPressComprehensiveLogic(oEvent);
                        }
                    }.bind(this)
                });
            } catch (error) {
                throw MessageToast.show(this._getText("orderProcessing_Valid_Confirm") + error.message);
            }
        },


        /**Function that contains the save logic for the comprehensive test result.
         * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 01.01.2025
         * @author MA
         * @fires onPressComprehensiveLogic
         */
        onBtnPressSaveComprehensive: async function (oEvent) {
            try {
                const oRoot = this.getFragmentRoot();
                let sValidComprehensive = this._getText("ValidComprehensiveSave");
                let aSelectedData = oRoot.getModel("aComprehensiveModel").getData();
                let bValid = false;
                bValid = aSelectedData.responseArray.some(Item =>
                    Item.SubCategory.some(SubItem =>
                        SubItem.controlTypeValueLabel1 === true ||
                        SubItem.controlTypeValueLabel2 === true
                    )
                );
                if (!bValid) {
                    MessageBox.warning(sValidComprehensive);
                    return
                }
                this.onPressComprehensiveLogic(oEvent);
            } catch (error) {
                throw MessageToast.show(this._getText("orderProcessing_Valid_Confirm") + error.message);
            }
        },

        onPanelExpand: function (oEvent) {
            var bExpanded = oEvent.getParameter("expand");
            var oBindingContext = oEvent.getSource().getBindingContext("aComprehensiveModel");

            delete oBindingContext.getPath() + '/isShowPended';
            delete oBindingContext.getPath() + '/isShowArabic';
            let data = {
                Path: oBindingContext.getPath(),
                IsVisible: bExpanded
            }
            if (!this.aHoldDataExpended) {
                this.aHoldDataExpended = [];
            }

            let iIndex = this.aHoldDataExpended.findIndex(item => item.Path === data.Path);
            if (iIndex > -1) {
                this.aHoldDataExpended[iIndex].IsVisible = data.IsVisible;
            } else {

                this.aHoldDataExpended.push(data);
            }

            if (bExpanded) {
                oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/isShowPended", true);
                oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/isShowArabic", false);

            } else {
                oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/isShowArabic", true);
                oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/isShowPended", false);

            }

        },

        /**
       * Functon triggred open Confirmation Dialog for Attached Files
       * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
       * @version 1.0.0
       * @since 10.02.2025
       * @fires onBtnPressApprovalHistory
       * @author MM
       */

        onBtnPressApprovalHistory: async function () {
            const oRoot = this.getFragmentRoot();
            // Create a fresh fragment each time
            if (!this._ApprovalHistoryModified) {
                this._ApprovalHistoryModified = await Fragment.load({
                    id: oRoot.getId(),
                    name: "adnoc.vi.vehicleinspection.modone.fragment.view.ApprovalHistory",
                    controller: this
                });
                oRoot.addDependent(this._ApprovalHistoryModified);
            }


            if (!this.oDialog) {
                this.oDialog = await Fragment.load({
                    id: 'ApprovalHistoryDialogId', // Unique per view
                    name: "adnoc.vi.vehicleinspection.modone.fragment.view.ApprovalHistory",
                    controller: this
                });
            }


            // Add it as a dependent (so it gets auto-destroyed with the view)
            oRoot.addDependent(this.oDialog);
            await this.onBtnPressGetAppHistoryData();
            this.oDialog.open();
        },

        /**
        * Functon triggred open to get Approval History data
        * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressGetAppHistoryData
        * @author MM
        */

        onBtnPressGetAppHistoryData: async function () {
            const oRoot = this.getFragmentRoot();
            let aCharStatusList = this.charStatusData;

            const validTests = [Constant.TESTTYPE.COMPREHENSIVE, Constant.TESTTYPE.TRAFFIC, Constant.TESTTYPE.PERMIT, Constant.TESTTYPE.MODIFIED];
            const aFilteredResults = aCharStatusList.vehOrdInspLinesTestChars.results.filter(
                item => validTests.includes(item.applicableTestName)
            );

            await this._parentController.createNewModelUsingAPI(Constant.GET, `/VehicleOrderInspectionLinesTestChar('${aFilteredResults[0].VehicleOrderInspectionLinesTestCharUUID}')?$expand=testResApprovalHistories($orderby=actionDate asc)`, '', 'ApprovalHistoryResModel');

            let oModelApprovalHisResModel = oRoot.getModel('ApprovalHistoryResModel');
            let oModelApprovalHisData = oModelApprovalHisResModel.getData().testResApprovalHistories.results;

            oModelApprovalHisData.map((item, index) => {
               item.srNo = index + 1
            })
            oModelApprovalHisResModel.refresh(true);

        },
        /**
      * Functon triggred open Indicator Color for Approval History
      * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
      * @version 1.0.0
      * @since 10.10.2025
      * @fires getActionState
      * @author MM
      */

        getActionState: function (sAction) {
            switch (sAction) {
                case Constant.APPROVALSTATUS.APPROVED: return "Success";
                case Constant.APPROVALSTATUS.REJECTED: return "Error";
                case Constant.APPROVALSTATUS.RESENT: return "Success";
                case Constant.APPROVALSTATUS.INITIATOR: return "Success";
                default: return "None";
            }
        },


        /**
         * This function is save approval history data 
         * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
         * @version 1.0.0
         * @since 19.05.2025
         * @fires createNewModelUsingAPI
         * @author Afshan
         */
        _saveApprovalHistory: async function (oApprovalHistory) {
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                `/TestResultApprovalHistory`,
                oApprovalHistory,
                'PermitApprovalHistory'
            );
        },
        /**
      * Functon for Close View Approval History Dialog
      * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
      * @version 1.0.0
      * @since 10.02.2025
      * @fires onBtnPressApprovalCancel
      * @author Afshan
      */

        onBtnPressApprovalCancel: function () {
            if (this.oDialog) {
                this.oDialog.close();
            }
        },

        //#endregion

        _getText: function (sKey) {
            return (
                this.getFragmentRoot()?.getModel("i18n")?.getResourceBundle()?.getText(sKey) ||
                sKey
            );
        },

    });
});
