sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "adnoc/vi/vehicleinspection/modone/constants/Constant",
    "adnoc/vi/vehicleinspection/modone/formatter/Formatter",
    'sap/m/Dialog',
    'sap/m/PDFViewer',
    "sap/ui/core/Fragment",
    'sap/m/Image',
    'sap/m/Button'
], function (Controller, JSONModel, MessageBox, MessageToast, Constant, Formatter, Dialog, PDFViewer, Fragment,Image,Button) {
    "use strict";
    let buttonId = '';
    return Controller.extend("adnoc.vi.vehicleinspection.modone.utils.FRGTrafficTestController", {

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
                oRoot.attachEvent("loadData", this.onBtnPressTrafficTest, this);
                this._eventAttached = true;
            }

            //  Define fragment-level variable using VIRGlobalModel data
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
        _getText: function (sKey) {
            return (
                this.getFragmentRoot()?.getModel("i18n")?.getResourceBundle()?.getText(sKey) ||
                sKey
            );
        },

        //#region TrafficRegion

        /**
        * Get Traffic Test Status, is tis Passed or Fail
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires getTrafficTestStatus
        * @author MM
        */

        getTrafficTestStatus: function () {
            const oRoot = this.getFragmentRoot();
            const oStatusModel = oRoot.getModel('aOrderProcessingModel');
            const oStatusData = oStatusModel.getData();
            let sTrafficVehicleGUID = '';
            let sTrafficVehicle = [];

            let oCharStatusList = oRoot.getModel("oGlobalModel").getProperty("/ServiceRowData")
            this.charStatusData = oCharStatusList;
            oCharStatusList = oStatusData.Data.find(Item => {
                return Item.vehOrdInspLines.results.filter(SunItem => { SunItem.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines })
            });
            const aFilteredTrafficRes = this.charStatusData.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.TRAFFIC);
            if (!aFilteredTrafficRes || aFilteredTrafficRes.length === Constant.ArrayZeroLength) {
                return null;
            }

            sTrafficVehicle = aFilteredTrafficRes.map(item => ({
                testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
                testStatus: item.testStatus,
                applicableTestName: item.applicableTestName
            }));

            sTrafficVehicleGUID = sTrafficVehicle[0]?.testUUID;

            const aMatchingTrafficItems = oStatusData.Data
                .flatMap(entry => entry.vehOrdInspLines?.results || []) // first level
                .flatMap(vehLine => vehLine.vehOrdInspLinesTestChars?.results || []) // second level
                .filter(item => item.VehicleOrderInspectionLinesTestCharUUID === sTrafficVehicleGUID);

            return aMatchingTrafficItems[0];
        },

        /**
        * Open Traffic Fragment to Bind Traffic data also
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressTrafficTest,onBtnPressGetAttachmentData,getTrafficTestDataAfterSave,getTrafficTestMasterData
        * @author MM
        */


        onBtnPressTrafficTest: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oApprovalResData = Formatter.onLoadGetDataInSessionStorage('BusinessData');
            const oOrderProcessingModelBase = oRoot.getModel("aOrderProcessingModel");
            if (!oOrderProcessingModelBase) {
                MessageBox.warning(this._getText("traffic_MessageBoxForModelNotFound"));
                return;
            }
            oRoot.setModel(oOrderProcessingModelBase, "aOrderProcessingModel");
            let aUpdatedData = oRoot.getModel('aOrderProcessingModel').getData();
            let oCharStatusList = oRoot.getModel("oGlobalModel").getProperty("/ServiceRowData");

            if (!oCharStatusList) {
                oCharStatusList = oRoot.getModel('VisibleButtonClickedDataModel').getData();
            }

            oCharStatusList = aUpdatedData.Data.find(Item => {
                return Item.vehOrdInspLines.results.filter(SunItem => { SunItem.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines })
            });

            const aTrafficfiltered = [];
            const oFilteredResults = [];

            oCharStatusList.vehOrdInspLines.results.forEach(headerLine => {
                headerLine.vehOrdInspLinesTestChars.results.forEach(item => {
                    if (item.applicableTestName === Constant.TESTTYPE.TRAFFIC) {
                        oFilteredResults.push(item);
                    } else if (item.applicableTestName === Constant.TESTTYPE.APPROVAL) {
                        aTrafficfiltered.push(item);
                    }
                });
            });

            let oMatchingItems = this.getTrafficTestStatus();
            let sTestStatus = oMatchingItems !== null ? oMatchingItems.testStatus : null;

            let oCommentModel = new JSONModel({
                testComments: null,
                testInspectedBy: null,
                testInspectionEndDate: null
            });

            const oGlobalModel = oRoot.getModel("oGlobalModel");
            const bHasTraffic = aTrafficfiltered.length >= Constant.oneRecordCheck && oApprovalResData.empRole === Constant.APPROVALROLE.INSPECTOR;

            oGlobalModel.setProperty("/isButtonSave", true);
            oGlobalModel.setProperty("/isButtonFileUpload", true);
            oGlobalModel.setProperty("/isButtonConfirm", !bHasTraffic);
            oGlobalModel.setProperty("/isButtonApproval", bHasTraffic);

            oRoot.setModel(oCommentModel, "trafficCommentModel");

            oRoot.getModel("trafficCommentModel").setProperty(`/testComments`, oFilteredResults[0].testComments);
            await this.onBtnPressGetAttachmentData();

            if (sTestStatus === Constant.STATUS.INPROGRESS || sTestStatus === Constant.STATUS.PASS || sTestStatus === Constant.STATUS.FAIL || sTestStatus === Constant.STATUS.PENDING) {
                await this.getTrafficTestDataAfterSave();
            }

            if (sTestStatus === Constant.STATUS.OPEN) {
                let oModel = new JSONModel({});
                oRoot.setModel(oModel, "TrafficSaveModel");
                oRoot.setModel(oModel, "ButtonVisibleModel");
                await this.getTrafficTestMasterData();
            }
        },

        /**
        * Close Traffic Dialog
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressCloseTraffic
        * @author MM
        */

        onBtnPressCloseTraffic: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
        },

        /**
        * Get Traffic Data from Traffic Master API
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires getTrafficTestMasterData
        * @author MM
        */

        getTrafficTestMasterData: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                `/fetchTrafficData`
                ,
                "",
                "TrafficMasterModel"
            );

            const oTrafficRes = oRoot.getModel("TrafficMasterModel");
            let oTrafficData = oTrafficRes?.getData()?.fetchTrafficData?.aResponseArray;
            this.createTreeTable(oTrafficData);

        },

        /**
        * Get Traffic Data after save and when re open Fragment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires getTrafficTestDataAfterSave,createTreeTable
        * @author MM
        */

        getTrafficTestDataAfterSave: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let aMatchingItems = this.getTrafficTestStatus();
            let sTrafficCharUUID = aMatchingItems.VehicleOrderInspectionLinesTestCharUUID;
            let sTrafficStatus = aMatchingItems.testStatus;

            let body = {
                "VehicleOrderInspectionLinesTestCharUUID": sTrafficCharUUID
            }
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                `/getTestResultTrafficById`,
                body,
                "TrafficAfterSaveModel"
            );
            const oTrafficResAfterSave = oRoot.getModel("TrafficAfterSaveModel");
            let oTrafficData = oTrafficResAfterSave?.getData()?.results;
            oRoot.getModel("trafficCommentModel").setProperty(`/testInspectedBy`, aMatchingItems.testInspectedBy);
            oRoot.getModel("trafficCommentModel").setProperty(`/testInspectionEndDate`, Formatter.getDateFromatIn_ddMMyyyy_HHmm(aMatchingItems.testInspectionEndDate));
            this.createTreeTable(oTrafficData);

            if (sTrafficStatus === Constant.STATUS.PASS || sTrafficStatus === Constant.STATUS.FAIL || sTrafficStatus === Constant.STATUS.PENDING) {
                oRoot.getModel("oGlobalModel").setProperty("/isButtonConfirm", false);
                oRoot.getModel("oGlobalModel").setProperty("/isButtonApproval", false);
                oRoot.getModel("oGlobalModel").setProperty("/isButtonSave", false);
                oRoot.getModel("oGlobalModel").setProperty("/isButtonFileUpload", false);

                var oModel = new JSONModel({
                    isControlEditable: false,
                });

            } else {
                oRoot.getModel("oGlobalModel").setProperty("/isButtonSave", true);
                oRoot.getModel("oGlobalModel").setProperty("/isButtonFileUpload", true);
                var oModel = new JSONModel({
                    isControlEditable: true,
                });
            }

            oRoot.setModel(oModel, "ButtonVisibleModel");

        },

        /**
        * Creating Tree Table in Traffic test
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires createTreeTable
        * @author MM
        */

        createTreeTable: function (resData) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let sTreeMatchingItems = this.getTrafficTestStatus();
            let sTreeStatus = sTreeMatchingItems.testStatus;
            let aFormattedData = [];

            resData.forEach((mainItem, mainIndex) => {
                // Parent Node (Main Category)
                let oParent = {
                    id: "parent_" + mainIndex,
                    testMainTypeTextEnglish: mainItem.testMainTypeTextEnglish,
                    testMainTypeTextArabic: mainItem.testMainTypeTextArabic,
                    testMainTypeNo: mainItem.testMainTypeNo,
                    isParent: true,
                    headerTypeValueLabel1: mainItem.headerTypeValueLabel1,
                    headerTypeValueLabel2: mainItem.headerTypeValueLabel2,
                    headerTypeValueLabel3: mainItem.headerTypeValueLabel3,
                    headerTypeValueLabel4: mainItem.headerTypeValueLabel4,
                    children: []

                };

                // Child Nodes (SubCategories)
                mainItem.SubCategory.forEach((subItem, subIndex) => {
                    let oChild = {
                        id: "child_" + mainIndex + "_" + subIndex,
                        testMainTypeTextEnglish: subItem.testSubTypeTextEnglish.replace(/\n/g, " "),
                        controlTypeValueLabel2Text: subItem.controlTypeValueLabel2Text,
                        controlTypeValueLabel1Text: subItem.controlTypeValueLabel1Text,
                        controlTypeValueLabel3Text: subItem.controlTypeValueLabel3Text,
                        controlTypeValueLabel4Text: subItem.controlTypeValueLabel4Text,
                        testMainTypeTextArabic: subItem.testSubTypeTextArabic.replace(/\n/g, " "),
                        isParen: false
                    };
                    if (sTreeStatus !== Constant.STATUS.OPEN) {

                        oChild.controlTypeValueLabel1 = subItem.controlTypeValueLabel1;
                        oChild.controlTypeValueLabel2 = subItem.controlTypeValueLabel2;
                        oChild.controlTypeValueLabel3 = subItem.controlTypeValueLabel3;
                        oChild.controlTypeValueLabel4 = subItem.controlTypeValueLabel4;
                    }
                    oParent.children.push(oChild);

                });

                aFormattedData.push(oParent);
            });


            // Create JSON Model & set it
            let oModel = new JSONModel({ responseArray: aFormattedData });
            oRoot.setModel(oModel, "treeModel");

        },

        /**
        * Radio Selection for Traffic Table in Traffic test
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onRadioSelectTrafficTest
        * @author MM
        */

        onRadioSelectTrafficTest: function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const oRadioButton = oEvent.getSource();
            const oContext = oRadioButton.getBindingContext("treeModel");

            if (!oContext) return;

            const oModel = oContext.getModel();
            const sPath = oContext.getPath();

            const sSelectedProp = oRadioButton.getCustomData().find(cd => cd.getKey() === "prop").getValue();

            // Decide the opposite property
            const oMap = {
                "controlTypeValueLabel1": "controlTypeValueLabel2",
                "controlTypeValueLabel2": "controlTypeValueLabel1",
                "controlTypeValueLabel3": "controlTypeValueLabel4",
                "controlTypeValueLabel4": "controlTypeValueLabel3"
            };

            const sOppositeProp = oMap[sSelectedProp];
            if (!sOppositeProp) return;

            oModel.setProperty(`${sPath}/${sSelectedProp}`, Constant.TRAFFICRADIOYES);
            oModel.setProperty(`${sPath}/${sOppositeProp}`, Constant.TRAFFICRADIONO);
        },

        /**
        * Generate Common Payload for Traffic test Saving & Patch
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires generateTrafficResultPayload
        * @author MM
        */

        generateTrafficResultPayload: async function (aTreeData) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            var trafficAttachModel = oRoot.getModel("TrafficResAttachmentModel");
            let oResAttachModel = [];
            if (trafficAttachModel) {
                oResAttachModel = trafficAttachModel.getData()?.results || [];
            }

            let oFileUploadModel = oRoot.getModel("FileUploadedModel")?.getData() || { FileCategory: [] };
            const oPayload = [];
            let dCurrentDate = new Date();

            let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate);
            let [datePart, timePart] = dFormattedDate.split(" ");

            //  Prepare main test result payload
            aTreeData.forEach(oParent => {
                const sMainTypeTextArabic = oParent.testMainTypeTextArabic;
                const sMainTypeTextEnglish = oParent.testMainTypeTextEnglish;
                const stestMainTypeNo = oParent.testMainTypeNo;

                (oParent.children || []).forEach((oChild, index) => {
                    const aItem = {
                        testMainTypeSrNo: index + 1,
                        testMainTypeNo: stestMainTypeNo,
                        testMainTypeTextEnglish: sMainTypeTextEnglish,
                        testMainTypeTextArabic: sMainTypeTextArabic,
                        testSubTypeTextEnglish: oChild.testMainTypeTextEnglish,
                        testSubTypeTextArabic: oChild.testMainTypeTextArabic,

                        controlTypeValueLabel2Text: oChild.controlTypeValueLabel2Text,
                        controlTypeValueLabel1Text: oChild.controlTypeValueLabel1Text,
                        controlTypeValueLabel3Text: oChild.controlTypeValueLabel3Text,
                        controlTypeValueLabel4Text: oChild.controlTypeValueLabel4Text,

                        controlTypeValueLabel1Flag: oChild.controlTypeValueLabel1 === Constant.TRAFFICRADIOYES ? true : false,
                        controlTypeValueLabel2Flag: oChild.controlTypeValueLabel2 === Constant.TRAFFICRADIOYES ? true : false,
                        controlTypeValueLabel3Flag: oChild.controlTypeValueLabel3 === Constant.TRAFFICRADIOYES ? true : false,
                        controlTypeValueLabel4Flag: oChild.controlTypeValueLabel4 === Constant.TRAFFICRADIOYES ? true : false
                    };
                    oPayload.push(aItem);
                });
            });

            //  Safely handle previous attachments
            let aRawPreviousData = oRoot.getModel('AttachResponseModel')?.getData()?.testResTrafficAttachs?.results || [];
            let oResPreviousAttachModel = aRawPreviousData.map((item, index) => ({
                testMainTypeSrNo: item.testMainTypeSrNo || index + 1,
                testMainTypeNo: item.testMainTypeNo,
                testMainTypeTextEnglish: item.testMainTypeTextEnglish,
                testMainTypeTextArabic: item.testMainTypeTextArabic,
                uploadedDate: Formatter.convertToYYYYMMDD_String(item.uploadedDate),
                uploadedTime: item.uploadedTime,
                DisplayName: item.DisplayName,
                attachmentGuId_attachmentGuId: item.attachmentGuId_attachmentGuId
            }));

            //  Start fresh attachment array
            let oPayloadAttachFiles = [...oResPreviousAttachModel];
            let iSrNo = oResPreviousAttachModel.length + 1;

            //  Add new attachments only if available
            if (Array.isArray(oFileUploadModel.FileCategory) && oFileUploadModel.FileCategory.length > 0) {
                oFileUploadModel.FileCategory.forEach(oCategory => {
                    const sMainTypeTextEnglish = oCategory.CategoryName;
                    const sMainTypeTextArabic = oCategory.CategoryNameArabic;
                    const sMainTypeNo = oCategory.CategoryTypeNo;

                    if (Array.isArray(oCategory.Files) && oCategory.Files.length > 0) {
                        oCategory.Files.forEach(oFile => {
                            const matchedAttachment = oResAttachModel.find(
                                (item) => item.attachmentName === oFile.attachmentName
                            );

                            if (matchedAttachment) {
                                const aAttachItem = {
                                    testMainTypeSrNo: iSrNo++,
                                    testMainTypeNo: sMainTypeNo,
                                    testMainTypeTextEnglish: sMainTypeTextEnglish,
                                    testMainTypeTextArabic: sMainTypeTextArabic,
                                    uploadedDate: datePart,
                                    uploadedTime: timePart,
                                    DisplayName: oFile.attachmentName,
                                    attachmentGuId_attachmentGuId: matchedAttachment.attachmentGuId
                                };
                                oPayloadAttachFiles.push(aAttachItem);
                            }
                        });
                    }
                });
            }

            //  Final payload (attachments optional)
            const finalPayload = {
                applicableTestName: null,
                testComments: null,
                testInspectedBy: null,
                testInspectionEndDate: null,
                testInspectionStartDate: null,
                testStatus: null,
                testResultsTraffics: oPayload,
                testResTrafficAttachs: oPayloadAttachFiles
            };

            return finalPayload;
        },


        /**
        * Generate Common Payload for Traffic test Saving & Patch
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressSaveTrafficTest,getTrafficTestStatus,onBtnPressSaveTrafficAttachment,generateTrafficResultPayload,updateServiceTestModel,onBtnPressCloseTraffic,onBtnPressClearFragmentAfterSave,patchAttachmentDataTraffic
        * @author MM
        */

        onBtnPressSaveTrafficTest: async function (oEvent) {
            var oRouter = this.getParentController().getOwnerComponent().getRouter();
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            var oEmployeeData = Formatter.onLoadGetDataInSessionStorage('BusinessData');
            var oEmpApprovalData = Formatter.onLoadGetDataInSessionStorage('ApprovalDetailData');
            let isAttachedFile = oRoot.getModel("oGlobalModel").getProperty("/isTrafficAttchedFile");
            let isAttacheAPICalled = oRoot.getModel("oGlobalModel").getProperty("/isAttachmentCalled");
            const aApprovalRes = this.charStatusData.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.APPROVAL);
            let sVehicleStatus = this.getTrafficTestStatus();

            let oReqModel = oRoot.getModel("treeModel").getData().responseArray;
            let oCommentModel = oRoot.getModel("trafficCommentModel").getData();

            if (aApprovalRes.length == Constant.oneRecordCheck) {

                if (!oEmpApprovalData && oEmployeeData.empRole === Constant.APPROVALROLE.INSPECTOR) {
                    MessageBox.warning(this._getText("traffic_MessageBoxForApprovalBlank"));
                    return
                }

            }

            if (buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_SAVE_ID && isAttachedFile === "YES") {
                await this.onBtnPressSaveTrafficAttachment(); // optional
            }
            if (buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_CONFIRM_ID || buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_APPROVAL_ID) {
                // Validate first
                let isValidationFailed = await this.onValidateAttachedFile(sVehicleStatus.testStatus);
                if (isValidationFailed) {
                    return; // stop if validation fails
                }
            }
            const aRequestPayload = await this.generateTrafficResultPayload(oReqModel);
            let sTrafficVehicleGUID = '';
            let dCurrentDate = new Date();
            let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate);

            let oButton = oEvent.getSource();

            let fullId = oButton.getId();
            buttonId = fullId.split("--").pop();

            if (this.charStatusData && this.charStatusData.vehOrdInspLinesTestChars) {
                let aTrafficCharStatus = this.charStatusData;

                const aTrafficfilteredResults = [];
                const aTrafficfilteredApproval = [];

                aTrafficCharStatus.vehOrdInspLinesTestChars.results.forEach(item => {
                    if (item.applicableTestName === Constant.TESTTYPE.TRAFFIC) {
                        aTrafficfilteredResults.push(item);
                    } else if (item.applicableTestName === Constant.TESTTYPE.APPROVAL) {
                        aTrafficfilteredApproval.push(item);
                    }
                });

                const sTrafficVehicleOrderGuid = aTrafficfilteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.TRAFFIC)
                    .map(item => ({
                        testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
                        testStatus: item.testStatus,
                        applicableTestName: item.applicableTestName
                    }));

                if (sTrafficVehicleOrderGuid.length === Constant.ArrayZeroLength) {
                    return;
                }

                sTrafficVehicleGUID = sTrafficVehicleOrderGuid[0].testUUID;
                aRequestPayload.applicableTestName = sTrafficVehicleOrderGuid[0].applicableTestName;
                aRequestPayload.testInspectedBy = oEmployeeData.empNameEnglish;
                aRequestPayload.testInspectedByCode = oEmployeeData.empCode;
                aRequestPayload.testComments = oCommentModel.testComments;
                aRequestPayload.testInspectionStartDate = dFormattedDate;
                aRequestPayload.testInspectionEndDate = dFormattedDate;

                let sTrafficStatusSave = aRequestPayload.testResultsTraffics.every(item => item.controlTypeValueLabel4Flag === true) ? Constant.STATUS.PASS : Constant.STATUS.FAIL;

                const sTrafficRequiredFlag = aRequestPayload.testResultsTraffics.every(item => item.controlTypeValueLabel1Flag === false
                    && item.controlTypeValueLabel2Flag === false)

                if (sTrafficRequiredFlag) {
                    MessageToast.show(this._getText("traffic_MessageBoxForCategoryRequired"));
                    return
                }

                // Extract frequently used variables
                const sCurrentStatus = sTrafficVehicleOrderGuid[0]?.testStatus;
                const isOpenOrInProgress =
                    sCurrentStatus === Constant.STATUS.OPEN || sCurrentStatus === Constant.STATUS.INPROGRESS;

                // Initialize model once (used in multiple branches)

                if (isOpenOrInProgress) {
                    if (buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_SAVE_ID) {
                        // Case 1: Non-Traffic button
                        aRequestPayload.testStatus = Constant.STATUS.INPROGRESS;
                    } else if (aTrafficfilteredApproval.length == Constant.ArrayZeroLength && buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_CONFIRM_ID) {
                        // Case 2: Traffic button + No approvals
                        aRequestPayload.testStatus = sTrafficStatusSave;
                    } else if (aTrafficfilteredApproval.length == Constant.oneRecordCheck && buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_CONFIRM_ID) {
                        // Case 3: Traffic button + No approvals with Supervisor
                        aRequestPayload.testStatus = sTrafficStatusSave;

                        const oApprovalHistory = {
                            refDocumentID: sTrafficVehicleGUID, // Reference to main document (e.g., PO or Leave)
                            performedByUserId: oEmployeeData.empCode, // Current approver user ID
                            performedByMailAddress: oEmployeeData.empEmailAddress, // Current approver email
                            performedByFullName: oEmployeeData.empNameEnglish, // Current approver full name
                            action: Constant.APPROVALSTATUS.APPROVED,
                            comments: this._getText("SelfApproved"),
                            actionDate: new Date()
                        }
                        await this._saveApprovalHistory(oApprovalHistory);
                    } else if (aTrafficfilteredApproval.length == Constant.oneRecordCheck && buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_APPROVAL_ID) {
                        // Case 4: Traffic button + Multiple approvals
                        aRequestPayload.testStatus = Constant.STATUS.PENDING;
                    } else {
                        // Fallback
                        aRequestPayload.testStatus = sCurrentStatus;
                    }
                } else {
                    // Case 4: Already closed / completed
                    aRequestPayload.testStatus = sCurrentStatus;
                }

            }

            await this.deleteTrafficTestData(aRequestPayload, sTrafficVehicleGUID);
            await this._parentController.createNewModelUsingAPI(
                Constant.PATCH,
                `/VehicleOrderInspectionLinesTestChar('${sTrafficVehicleGUID}')`,
                aRequestPayload,
                'TrafficSaveModel'
            );

            let oTrafficSaveModel = oRoot.getModel("TrafficSaveModel");
            let oTrafficSaveData = oTrafficSaveModel.getData();
            if (isAttacheAPICalled) {
                await this.patchAttachmentDataTraffic();
            }
            if (buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_CONFIRM_ID) {
                MessageToast.show(this._getText("traffic_MessageBoxForConfirm"));
                oRouter.navTo(Constant.OrderProcessing, { fromScreen: "VisualScreen" });
            } else if (buttonId === Constant.BUTTONEVENT.TAB_TRAFFIC_APPROVAL_ID) {
                MessageToast.show(this._getText("traffic_MessageBoxForConfirmApproval"));
                oRouter.navTo(Constant.OrderProcessing, { fromScreen: "VisualScreen" });
            } else {
                MessageToast.show(this._getText("traffic_MessageBoxForSave"));
                oRouter.navTo(Constant.OrderProcessing, { fromScreen: "VisualScreen" });
            }
            this.onBtnPressClearFragmentAfterSave();
        },

        /**
        * Calling delete api before save traffic test
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires deleteTrafficTestData
        * @author MM
        */

        deleteTrafficTestData: async function (aRequestPayload, sTrafficVehicleGUID) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const oPayload = {
                applicableTestName: aRequestPayload.applicableTestName,
                testComments: null,
                testInspectedBy: aRequestPayload.testInspectedBy,
                testInspectedByCode: aRequestPayload.testInspectedByCode,
                testInspectionEndDate: aRequestPayload.testInspectionEndDate,
                testInspectionStartDate: aRequestPayload.testInspectionStartDate,
                testStatus: aRequestPayload.testStatus,
                testResultsTraffics: null
            };

            await this._parentController.createNewModelUsingAPI(
                Constant.PATCH,
                `/VehicleOrderInspectionLinesTestChar('${sTrafficVehicleGUID}')`,
                oPayload,
                'TrafficAfterDeleteModel'
            );
        },

        /**
        * Functon for Confirm calling traffic test
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressConfirmTrafficTest,onBtnPressSaveTrafficTest
        * @author MM
        */

        onBtnPressConfirmTrafficTest(oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oButton = oEvent.getSource();
            let fullId = oButton.getId(Constant.BUTTONEVENT.TAB_TRAFFIC_CONFIRM_ID);
            let isBtnApproval = oRoot.getModel("oGlobalModel").getProperty("/isButtonApproval");
            buttonId = fullId.split("--").pop();
            MessageBox.confirm(
                isBtnApproval ? this._getText("traffic_MessageBoxForApproval") : this._getText("traffic_MessageBoxForConfirmation"), {
                icon: MessageBox.Icon.INFORMATION,
                title: this._getText("commonmsgConfirmation"),
                class: "sapUiSizeCompact",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        this.onBtnPressSaveTrafficTest(oEvent);
                    }
                }.bind(this)
            });
        },

        /**
        * Functon for File Uploading Functionality
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressFileUpload
        * @author MM
        */

        onBtnPressFileUpload: function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const oFileModel = oRoot.getModel("FileUploadedModel");
            const oFileData = oFileModel.getData();
            const oReqModel = oRoot.getModel("treeModel").getData().responseArray;

            // Ensure FileCategory is initialized
            if (!oFileData.FileCategory) {
                oFileData.FileCategory = [];
            }

            // Remove any categories that are blank/null
            oFileData.FileCategory = oFileData.FileCategory.filter(cat =>
                cat.CategoryName && cat.CategoryName.trim() !== ""
            );

            // Merge categories (preserve existing ones)
            oReqModel.forEach((item) => {
                let aExistingCategory = oFileData.FileCategory.find(cat =>
                    cat.CategoryName === item.testMainTypeTextEnglish
                );

                if (!aExistingCategory) {
                    oFileData.FileCategory.push({
                        CategoryName: item.testMainTypeTextEnglish,
                        CategoryNameArabic: item.testMainTypeTextArabic,
                        CategoryTypeNo: item.testMainTypeNo,
                        Files: []
                    });
                } else {
                    // Optional cleanup: remove invalid files
                    aExistingCategory.Files = (aExistingCategory.Files || []).filter(file =>
                        file && file.attachmentName
                    );
                }
            });

            // Set refreshed data
            oFileModel.setData(oFileData);
            oFileModel.refresh(true);
            if (!this.fileUploadFlag) {
                this.fileUploadFlag = sap.ui.xmlfragment("FileUploadDialog", "adnoc.vi.vehicleinspection.modone.fragment.view.FilesUpload", this);
                oRoot.addDependent(this.fileUploadFlag);
            }
            this.fileUploadFlag.open();
        },

        /**
        * Functon for Close File Uploading Fragment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressCloseFileUpload
        * @author MM
        */

        onBtnPressCloseFileUpload: function () {
            if (this.fileUploadFlag) {
                this.fileUploadFlag.close();
            }
        },

        /**
        * Functon for Clear File Uploading Fragment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressClearFragmentAfterSave
        * @author MM
        */

        onBtnPressClearFragmentAfterSave: function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oFileUploadModel = oRoot.getModel("FileUploadedModel");

            if (this.fileUploadFlag) {
                this.fileUploadFlag.close();
                this.fileUploadFlag.destroy();
                this.fileUploadFlag = null;
                oFileUploadModel.setProperty("/FileCategory", []);
            }
        },

        /**
        * Functon for Save Attachment API 
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressSaveTrafficAttachment
        * @author MM
        */

        onBtnPressSaveTrafficAttachment: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oFileUploadModel = oRoot.getModel("FileUploadedModel").getData();
            let oFiles = []; // Final array to collect all files

            // 🛠 Loop over each Category
            oFileUploadModel.FileCategory.forEach((oCategory) => {
                // Check if Files exist inside category
                if (oCategory.Files && oCategory.Files.length) {
                    oCategory.Files.forEach((oFile) => {
                        if (oFile.base64File != null) {
                            oFiles.push({
                                "attachmentGuId": null,
                                "attachmentName": oFile.attachmentName,
                                "orgFileName": oFile.orgFileName,
                                "orgFileExtension": oFile.orgFileExtension,
                                "docType": null,
                                "docId": null,
                                "docGuid": null,
                                "base64File": oFile.base64File
                            });
                        } else {
                            oFile = [];
                        }
                    });
                }
            });

            let oTrafficPayload = {
                Files: oFiles
            };


            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                '/uploadAttachment',
                oTrafficPayload,
                'TrafficResAttachmentModel'
            );

            let oModel = oRoot.getModel('TrafficResAttachmentModel');
            let oData = oModel.getData();
            oRoot.getModel("oGlobalModel").setProperty("/isAttachmentCalled", true);
            let lAttachmentData = oData.results;
            return lAttachmentData;
        },

        /**
        * Functon for Patch Attachment API 
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires patchAttachmentDataTraffic
        * @author MM
        */

        patchAttachmentDataTraffic: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;

            let oSaveResModel = oRoot.getModel("TrafficSaveModel");
            let oTrafficResModel = oRoot.getModel('TrafficResAttachmentModel');
            let oTrafficResData = oTrafficResModel.getData().results; // Attachments
            let oSaveResData = oSaveResModel.getData();               // Save data (for GUID)
            let sVechileOrderCharGUID = oSaveResData.VehicleOrderInspectionLinesTestCharUUID; // Your docGuid

            if (!sVechileOrderCharGUID) {
                MessageBox.error(this._getText("traffic_MessageBoxForGuidNotFound"));
                return;
            }

            let aFilesPayload = [];

            // 🛠 Prepare required payload
            oTrafficResData.forEach((oAttachment) => {
                aFilesPayload.push({
                    attachmentGuId: oAttachment.attachmentGuId,
                    docGuid: sVechileOrderCharGUID
                });
            });

            let oPayload = {
                Files: aFilesPayload
            };
            await this._parentController.createNewModelUsingAPI(Constant.POST, '/updateAttachmentDocGuid', oPayload, 'PatchResponseModel');

            let oAttachmentPatchModel = oRoot.getModel('PatchResponseModel');
            let oData = oAttachmentPatchModel.getData();

        },

        /**
        * Functon for Final Structure for Attachment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressSaveAttachmentFiles,onBtnPressCloseFileUpload
        * @author MM
        */

        onBtnPressSaveAttachmentFiles: function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oFileUploadModel = oRoot.getModel("FileUploadedModel");
            let oFIleUploadData = oFileUploadModel.getData();

            let hasAttachments = oFIleUploadData.FileCategory.some(category => {
                return category.Files.some(file => file.attachmentGuId || file.attachmentName || file.base64File);
            });
            if (hasAttachments) {
                oRoot.getModel("oGlobalModel").setProperty("/isTrafficAttchedFile", "YES");
            }
            oFileUploadModel.refresh(true);
            if (oFIleUploadData.FileCategory.length != 0) {
                this.onBtnPressCloseFileUpload();
            }
        },

        /**
        * Functon for File Change when upload files
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressTrafficFileChange
        * @author MM
        */

        onBtnPressTrafficFileChange: function (oEventOrFiles, iForcedIndex) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const oModel = oRoot.getModel("FileUploadedModel");
            const oModelData = oModel.getData();
            let aFiles = [];
            let iIndex;
            let oFileUploader;

            // Single or multiple File(s) passed directly (e.g., from camera)
            if (Array.isArray(oEventOrFiles)) {
                aFiles = oEventOrFiles;
                iIndex = iForcedIndex;

            } else if (oEventOrFiles instanceof File) {
                aFiles = [oEventOrFiles];
                iIndex = iForcedIndex;

            } else {
                // Normal file uploader input
                oFileUploader = oEventOrFiles.getSource();
                const fileList = oEventOrFiles.getParameter("files");
                aFiles = Array.from(fileList);

                const oContext = oFileUploader.getBindingContext("FileUploadedModel");

                if (!oContext) {
                    return;
                }

                iIndex = oContext.getPath().split("/").pop();
            }

            const oSelectedCategory = oModelData.FileCategory[iIndex];

            if (!oSelectedCategory) {
                return;
            }

            if (!oSelectedCategory.Files) {
                oSelectedCategory.Files = [];
            }

            // Max file validation
            if (oSelectedCategory.Files.length + aFiles.length > 5) {
                MessageBox.warning(this._getText("traffic_MessageBoxForFileMaxSize"));
                if (oFileUploader) oFileUploader.setValue("");
                return;
            }

            aFiles.forEach((file) => {
                if (file.size > 10 * 1024 * 1024) {
                    MessageBox.warning(this._getText("traffic_MessageBoxForFileMBSize"));
                    if (oFileUploader) oFileUploader.setValue("");
                    return;
                }

                this._readFileAsBase64Multiple(file, (base64) => {
                    oSelectedCategory.Files.push({
                        attachmentName: file.name,
                        orgFileExtension: file.name.split('.').pop(),
                        orgFileName: file.name,
                        base64File: base64,
                        source: file._source || "upload"
                    });

                    oModel.refresh(true);
                });
            });
        },

        /**
        * Functon for Generate Base64 Structure for Attachment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires _readFileAsBase64Multiple
        * @author MM
        */

        _readFileAsBase64Multiple: function (file, callback) {
            const fReader = new FileReader();
            fReader.onload = function (event) {
                const base64String = event.target.result.split(",")[1]; // Get Base64 part of the string
                callback(base64String);
            };
            fReader.onerror = function (error) {
                MessageBox.error(this._getText("traffic_MessageBoxForReadingFile") + file.name);
            };
            fReader.readAsDataURL(file); // Read file as Data URL

        },

        /**
        * Functon for View Uploaded Files Fragment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressViewFiles
        * @author MM
        */

        onBtnPressViewFiles: async function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            if (!this.fileViewFlag) {
                this.fileViewFlag = sap.ui.xmlfragment("FileViewDialog", "adnoc.vi.vehicleinspection.modone.fragment.view.FileUploadView", this);
                oRoot.addDependent(this.fileViewFlag);
            }
            this.fileViewFlag.open();
        },

        /**
        * Functon for Get Attachment data API call
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressGetAttachmentData
        * @author MM
        */

        onBtnPressGetAttachmentData: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let sVehicleGUUIDRes = this.getTrafficTestStatus();

            await this._parentController.createNewModelUsingAPI(Constant.GET, `/VehicleOrderInspectionLinesTestChar('${sVehicleGUUIDRes.VehicleOrderInspectionLinesTestCharUUID}')?$expand=testResTrafficAttachs,testResApprovalHistories`, '', 'AttachResponseModel');

            let oModelAttachRes = oRoot.getModel('AttachResponseModel').getData();
            let oModelAttachResData = oModelAttachRes.testResTrafficAttachs.results;
            let oModelApprovalHistoriesData = oModelAttachRes.testResApprovalHistories.results;
            if (oModelAttachResData.length > Constant.ArrayZeroLength) {
                oRoot.getModel("oGlobalModel").setProperty("/isTrafficAttchedFile", "YES");
            }

            if (oModelApprovalHistoriesData.length > Constant.ArrayZeroLength) {
                oRoot.getModel("oGlobalModel").setProperty("/isAppHistoryBtnShow", true);
            }

            const oFileViewModel = oRoot.getModel('FileViewModel');
            const oFileViewData = oFileViewModel.getData();

            oModelAttachResData.map((item) => {
                item.uploadedDate = Formatter.getDateFromatIn_ddMMyyyy(item.uploadedDate)
                item.uploadedTime = Formatter.formatEdmTime(item.uploadedTime)
            })

            oFileViewData.FileDetail = oModelAttachResData;

            oFileViewModel.setData(oFileViewData);
            oFileViewModel.refresh(true);

        },

        /**
        * Functon for Close View File Dialog
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressFileViewClose
        * @author MM
        */

        onBtnPressFileViewClose: function () {
            if (this.fileViewFlag) {
                this.fileViewFlag.close();
            }
        },

        /**
        * Functon for View File Dialog
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires displayAttachment
        * @author MM
        */

        displayAttachment: function (attachmentData) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            if (!attachmentData.attachmentGuId || !attachmentData.base64File || !attachmentData.orgFileExtension) {
                MessageToast.show(this._getText("traffic_MessageBoxForInvalidAttachment"));
                return;
            }

            let sBase64 = attachmentData.base64File;
            let sFileType = attachmentData.orgFileExtension;

            let byteCharacters = atob(sBase64);
            let byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
            let byteArray = new Uint8Array(byteNumbers);
            let blob = new Blob([byteArray], { type: 'application/pdf' });
            let sBlobUrl = URL.createObjectURL(blob);

            if (sFileType === "pdf") {
                var oPDFViewer = new PDFViewer();
                oRoot.addDependent(oPDFViewer);
                oPDFViewer.setSource(sBlobUrl);
                oPDFViewer.open();
            }
            else if (["png", "jpg", "jpeg", "avif"].includes(sFileType.toLowerCase())) {
                const oDialog = new Dialog({
                    title: "View Attachment",
                    content: new Image({
                        src: sBlobUrl,
                        width: "100%",
                        height: "100%"
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            oDialog.close(); // Use the dialog instance directly
                        }
                    })
                });

                // Open the dialog
                oDialog.open();
            }
            else {
                MessageToast.show(this._getText("traffic_MessageBoxForUnSupported"));
            }
        },

        /**
        * Functon for View File Dialog handler
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onViewFileHandler,displayAttachment
        * @author MM
        */

        onViewFileHandler: async function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            // Process the selected attachment
            let oBindingContext = oEvent.getSource().getBindingContext("FileViewModel");
            let oSelectedAttachment = oBindingContext.getObject();
            if (!oSelectedAttachment || !oSelectedAttachment.attachmentGuId_attachmentGuId) {
                MessageToast.show(this._getText("traffic_MessageBoxForMissing"));
                return;
            }

            // Proceed with the selected attachment
            let payload = {
                "attachmentGuId": oSelectedAttachment.attachmentGuId_attachmentGuId
            };

            await this._parentController.createNewModelUsingAPI(Constant.POST, "/getAttachmentByGuid", payload, "viewAttachModel");
            const res = oRoot.getModel('viewAttachModel').getData();

            if (res) {
                this.displayAttachment(res.getAttachmentByGuid);
            } else {
                MessageBox.error(res.object.responseJSON.error.value || this._getText("traffic_MessageBoxForFailed"));
            }
        },

        /**
        * Functon for View File Dialog handler
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onViewFileTraffic
        * @author MM
        */

        onViewFileTraffic: async function (oEvent) {
            await this.onViewFileHandler(oEvent);
        },

        /**
        * Functon for Download File handler
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onDownloadFileHandler
        * @author MM
        */

        onDownloadFileHandler: async function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oBindingContext = oEvent.getSource().getBindingContext("FileViewModel");
            let oSelectedAttachment = oBindingContext.getObject();
            if (!oSelectedAttachment || !oSelectedAttachment.attachmentGuId_attachmentGuId) {
                MessageToast.show(this._getText("traffic_MessageBoxForMissing"));
                return;
            }

            // Proceed with the selected attachment
            let payload = {
                "attachmentGuId": oSelectedAttachment.attachmentGuId_attachmentGuId
            };

            // API call to fetch the attachment data

            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                "/getAttachmentByGuid",
                payload,
                "downloadAttachModel"
            );
            const res = oRoot.getModel('downloadAttachModel').getData();

            if (res) {
                this.downloadAttachmentData(res);
            } else {
                MessageBox.error(res.object.responseJSON.error.value || this._getText("traffic_MessageBoxForFailed"));
            }
        },

        /**
        * Functon for Download File
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires downloadAttachmentData
        * @author MM
        */

        downloadAttachmentData: function (downloaData) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            var sBase64 = downloaData.getAttachmentByGuid.base64File;
            var sFileType = downloaData.getAttachmentByGuid.orgFileExtension;
            var actualFileName = downloaData.getAttachmentByGuid.attachmentName;

            // Convert base64 to binary (Blob)
            var byteCharacters = atob(sBase64);
            var byteNumbers = new Array(byteCharacters.length);
            for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            var blob = new Blob([byteArray], { type: sFileType });
            // Create a Blob URL and trigger download
            var sBlobUrl = URL.createObjectURL(blob);
            var aLink = document.createElement('a');
            aLink.href = sBlobUrl;
            aLink.download = actualFileName; // Assuming file extension is part of sFileType
            aLink.click();
            MessageToast.show(this._getText("traffic_MessageBoxForDownload"));
        },

        /**
        * Functon for Download File
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onDownloadTrafficTest,onDownloadFileHandler
        * @author MM
        */

        onDownloadTrafficTest: async function (oEvent) {
            await this.onDownloadFileHandler(oEvent);
        },

        /**
        * Functon for Validate Attahcment Files
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onValidateAttachedFile
        * @author MM
        */

        onValidateAttachedFile: async function (sStatus) {
            const oRoot = this.getFragmentRoot();
            let isAttachInvalid = false;
            let oFileUploadModel = oRoot.getModel("FileUploadedModel").getData();
            let isTrafficAttched = oRoot.getModel("oGlobalModel").getProperty("/isTrafficAttchedFile");

            // Check if there are any valid attachments
            let hasAttachments = oFileUploadModel.FileCategory.some(category => {
                return category.Files.some(file => file.attachmentGuId || file.attachmentName || file.base64File);
            });

            //  Handle cases based on status
            switch (sStatus) {
                case Constant.STATUS.INPROGRESS:
                case Constant.STATUS.CONFIRM:
                    // Case 1 & 2 & 3
                    if (!hasAttachments && isTrafficAttched === "NO") {
                        // Case 1 → Mandatory if blank
                        isAttachInvalid = true;
                        MessageBox.warning(this._getText("traffic_MessageBoxForUploadValidFile"));
                    } else if (hasAttachments && isTrafficAttched === "YES") {
                        // Case 2 & 3 → OK if already attached or adding more
                        isAttachInvalid = false;
                        await this.onBtnPressSaveTrafficAttachment();
                    } else {
                        // Case 2 & 3 → OK if already attached or adding more
                        isAttachInvalid = false;
                    }
                    break;

                case Constant.STATUS.OPEN:
                    // Case 4 → Mandatory if blank
                    if (!hasAttachments) {
                        isAttachInvalid = true;
                        MessageBox.warning(this._getText("traffic_MessageBoxForUploadValidFile"));
                    } else {
                        isAttachInvalid = false;
                        await this.onBtnPressSaveTrafficAttachment();
                    }
                    break;

                default:
                    // For other statuses, no check
                    isAttachInvalid = false;
                    break;
            }

            return isAttachInvalid;
        },

        /**
        * Functon for Open Camera in Fragment
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onOpenCameraDialog,onCaptureImage
        * @author MM
        */

        onOpenCameraDialog: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("FileUploadedModel");
            const iIndex = oContext.getPath().split("/").pop();

            this._currentUploadIndex = iIndex; // Store index for later

            // Now open the camera dialog
            this.onCaptureImage();
        },

        /**
        * Functon for Captured Image from Camera
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onCaptureImage
        * @author MM
        */

        onCaptureImage: function (oEvent) {

            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const that = this;
            if (!this._cameraDialog) {
                this._cameraDialog = sap.ui.xmlfragment(oRoot.getId(), "adnoc.vi.vehicleinspection.modone.fragment.view.CameraCapture", this);
                oRoot.addDependent(this._cameraDialog);
            }

            this._cameraDialog.open();

            // Start camera after open
            setTimeout(() => {
                navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
                    .then(function (stream) {
                        that._cameraStream = stream;
                        const videoElement = document.getElementById("cameraStream");
                        if (videoElement) {
                            videoElement.srcObject = stream;
                        }
                    })
                    .catch(function (err) {
                        MessageBox.error(this._getText("traffic_MessageBoxForCameraAccess") + ' ' + err.message);
                    });
            }, 500); // Delay for dialog rendering
        },

        /**
        * Functon for Take Photo
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onTakePhoto
        * @author MM
        */

        onTakePhoto: function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const video = document.getElementById("cameraStream");
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const that = this;
            canvas.toBlob(function (blob) {
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                const filename = `captured_${timestamp}_${randomString}.jpg`;
                const file = new File([blob], filename, { type: "image/jpeg" });
                file._source = "camera";

                const iCurrentCategoryIndex = that._currentUploadIndex; // ← You must set this before opening the camera
                that.isCameraCaptured(file);
                that.onBtnPressTrafficFileChange(file, iCurrentCategoryIndex);
                MessageToast.show(that._getText("traffic_MessageBoxForImageCaptured"));
                that.onCloseCameraDialog(); // Optional: close after capture
            }, "image/jpeg");
        },

        /**
        * Functon for Switch Camera Back or Front
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onSwitchCamera,restartCameraStream
        * @author MM
        */

        onSwitchCamera: function () {
            sFacingMode = sFacingMode === "environment" ? "user" : "environment";
            this.restartCameraStream();
        },

        /**
        * Functon for Re Start Camera Stream
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires restartCameraStream
        * @author MM
        */

        restartCameraStream: function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            const that = this;

            // Stop previous stream if active
            if (this._cameraStream) {
                this._cameraStream.getTracks().forEach(track => track.stop());
                this._cameraStream = null;
            }

            // Start new stream with updated facing mode
            navigator.mediaDevices.getUserMedia({ video: { facingMode: sFacingMode }, audio: false })
                .then(function (stream) {
                    that._cameraStream = stream;
                    const videoElement = document.getElementById("cameraStream");
                    if (videoElement) {
                        videoElement.srcObject = stream;
                    }
                })
                .catch(function (err) {
                    MessageBox.error(this._getText("traffic_MessageBoxForCameraAccess") + ' ' + err.message);
                });
        },

        /**
        * Functon for is Image Captured or Not ?
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires isCameraCaptured
        * @author MM
        */

        isCameraCaptured: function (aFiles) {
            return Array.isArray(aFiles) && aFiles.some(file => file.source === "camera") ? "Accept" : "Transparent";
        },

        /**
        * Functon for Image Captured Count
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires isCameraCapturedCount
        * @author MM
        */

        isCameraCapturedCount: function (aFiles) {
            return Array.isArray(aFiles) && aFiles.length > Constant.isArray && aFiles.some(file => file.source === "camera");
        },

        /**
        * Functon for Close Camera Dialog
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onCloseCameraDialog
        * @author MM
        */

        onCloseCameraDialog: function () {
            if (this._cameraDialog) {
                this._cameraDialog.close();
            }
            if (this._cameraStream) {
                this._cameraStream.getTracks().forEach(track => track.stop());
                this._cameraStream = null;
            }
        },

        /**
        * Functon triggred for calling delete API for Attached Files
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires deleteAttachmentFromTable
        * @author MM
        */

        deleteAttachmentFromTable: async function (oDelFileObj) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            await this._parentController.createNewModelUsingAPI("DELETE", `/TestResTrafficAttachs(${oDelFileObj[0].testResultsAttachsUUID})`, '', "deleteAttachTableModel");
            const oDeleteResponse = oRoot.getModel("deleteAttachTableModel");

            if (oDeleteResponse) {
            } else {
                let oRes = JSON.parse(oDeleteResponse.object.responseText);
                MessageBox.error(oRes.error?.message?.value);
                return;
            }
        },

        /**
        * Functon triggred for calling delete API for Attached Files
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires deleteAttachmentTraffic
        * @author MM
        */

        deleteAttachmentTraffic: async function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            let oBindingContext = oEvent.getSource().getBindingContext("FileViewModel");
            let oSelectedAttachment = oBindingContext.getObject();

            if (!oSelectedAttachment || !oSelectedAttachment.attachmentGuId_attachmentGuId) {
                MessageToast.show(this._getText("traffic_MessageBoxForMissing"));
                return;
            }

            let oDelPayload = {
                "Files": [
                    {
                        "attachmentGuId": oSelectedAttachment.attachmentGuId_attachmentGuId
                    }
                ]
            };


            await this._parentController.createNewModelUsingAPI(Constant.POST, "/deleteAttachmentFromDMS", oDelPayload, "deleteAttachModel");

            const oDeleteResponse = oRoot.getModel("deleteAttachModel");

            if (oDeleteResponse) {
                MessageToast.show(this._getText("fileView_AttachedDeleted"));

                let oFileViewModel = oRoot.getModel("FileViewModel");
                let aFileViewData = oFileViewModel.getProperty("/FileDetail"); // assume your array path is /Attachments

                let iDelFileIndex = aFileViewData.findIndex(item =>
                    item.attachmentGuId_attachmentGuId === oSelectedAttachment.attachmentGuId_attachmentGuId
                );

                let oDelFileObj = aFileViewData.filter(item =>
                    item.attachmentGuId_attachmentGuId === oSelectedAttachment.attachmentGuId_attachmentGuId
                );

                if (iDelFileIndex > -1) {
                    aFileViewData.splice(iDelFileIndex, 1); // Remove 1 item at that index

                    //  Update model
                    oFileViewModel.setProperty("/FileDetail", aFileViewData);
                    this.deleteAttachmentFromTable(oDelFileObj);
                }


            } else {
                let oRes = JSON.parse(oDeleteResponse.object.responseText);
                MessageBox.error(oRes.error?.message?.value);
                return;
            }
        },


        /**
        * Functon triggred open Confirmation Dialog for Attached Files
        * @memberof adnoc.vi.vehicleinspection.modone.fragment.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressDeleteAttachment
        * @author MM
        */


        onBtnPressDeleteAttachment: function (oEvent) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            MessageBox.confirm(
                this._getText("salesOrder_messageToastAreyousureyouwanttoConfirm"), {
                icon: MessageBox.Icon.INFORMATION,
                title: this._getText("VisualIns_MessageBoxConfirmdelete"),
                class: "sapUiSizeCompact",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        this.deleteAttachmentTraffic(oEvent);
                    }
                }.bind(this)
            });
        },

        /**
        * Functon triggred open Confirmation Dialog for Attached Files
        * @memberof adnoc.vi.vehicleinspection.modone.controller.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressApprovalHistory
        * @author MM
        */

        onBtnPressApprovalHistory: async function () {
            const oRoot = this.getFragmentRoot();

            if (!this._oApprovalHistoryDialog) {
                this._oApprovalHistoryDialog = await Fragment.load({
                    id: oRoot.getId(),
                    name: "adnoc.vi.vehicleinspection.modone.fragment.view.ApprovalHistory",
                    controller: this
                });
                oRoot.addDependent(this._oApprovalHistoryDialog);
            }

            await this.onBtnPressGetAppHistoryData();
            this._oApprovalHistoryDialog.open();
        },

        /**
        * Functon for Close View Approval History Dialog
        * @memberof adnoc.vi.vehicleinspection.modone.controller.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressApprovalCancel
        * @author MM
        */

        onBtnPressApprovalCancel: function () {
            if (this._oApprovalHistoryDialog) {
                this._oApprovalHistoryDialog.close();
            }
        },
        /**
        * Functon triggred open to get Approval History data
        * @memberof adnoc.vi.vehicleinspection.modone.controller.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.02.2025
        * @fires onBtnPressGetAppHistoryData
        * @author MM
        */

        onBtnPressGetAppHistoryData: async function () {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
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
        * Functon triggred to set Indicator Icon for Approval History
        * @memberof adnoc.vi.vehicleinspection.modone.controller.FRGTrafficTestController
        * @version 1.0.0
        * @since 10.10.2025
        * @fires getActionIcon
        * @author MM
        */

        getActionIcon: function (sAction) {
            switch (sAction) {
                case Constant.APPROVALSTATUS.APPROVED:
                    return "sap-icon://verified";

                case Constant.APPROVALSTATUS.REJECTED:
                    return "sap-icon://decline";

                case Constant.APPROVALSTATUS.RESENT:
                    return "sap-icon://redo";   // ✔ Neutral + clean

                case Constant.APPROVALSTATUS.INITIATOR:
                    return "sap-icon://begin";  // ✔ Neutral + clean

                default:
                    return "";
            }
        },

        /**
        * Functon triggred open Indicator Color for Approval History
        * @memberof adnoc.vi.vehicleinspection.modone.controller.FRGTrafficTestController
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
     * @memberof  adnoc.vi.vehicleinspection.modone.controller.FRGTrafficTestController
     * @version 1.0.0
     * @since 19.05.2025
     * @fires createNewModelUsingAPI
     * @author MM
     */
        _saveApprovalHistory: async function (oApprovalHistory) {
            const oRoot = this.getFragmentRoot();
            if (!oRoot) return;
            await this._parentController.createNewModelUsingAPI(
                Constant.POST,
                `/TestResultApprovalHistory`,
                oApprovalHistory,
                'PermitApprovalHistory'
            );
        }

    });
});