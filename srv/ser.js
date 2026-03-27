"use strict";

const cds = require('@sap/cds');
const path = require('path');
const FormData = require("form-data");
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { getDestination, retrieveJwt } = require('@sap-cloud-sdk/connectivity');
const { uuid } = cds.utils;
const VehicleSequenceGenerator = require('./lib/VehicleSequenceGenerator');
const { ReturnConstants } = require("./lib/Constants");
const { readCredential } = require("./lib/CredStore");
const { sendMail } = require('@sap-cloud-sdk/mail-client');
const { PDFDocument } = require('pdf-lib');
const { stringify } = require('querystring');
const { Console, count } = require('console');

module.exports = cds.service.impl(async (service) => {

    const db = await cds.connect.to("db");

    /******************************************************************************
     * Get all the entities to be used
    /*****************************************************************************/
    const { AnprRecaptureMaster, MapReportTmpltName, VehicleMasters, CustomerMasters, TestTypeMaster, TestResultsTraffic,
        TestTypeCombinationMaster, MaterialMasters, MaterialPricingMasters, MaterialCharacteristicsMasters,
        MaterialMastersView, MahaConfigurations, VehicleOrderInspections, TestResultsComprehensive,
        ComprehensiveResultSubType, DAttachment, DMSConfig, ManufacturerMasters, BodyColorMasters, CountryMasters,
        GearTypeMasters, WeightKindMasters, SteeringSideMasters, FuelTypeMasters, VehPlateSourceMasters,
        VehPlateColorMasters, VehPlateKindMasters, RegCarRemarkMasters, ModelMasters, VehicleKindMasters,
        VehicleTypeMasters, PlateATTMasters, VehicleLookupConfiguration, ReEmbossNum, TestResultsPermit,
        ErrorLogs, testResMahaInDtl, VehicleOrderInspectionLinesTestChar, VehicleOrderInspectionLines,
        Shifts, testMahaOutResult, testResMahaOutDtl, testResMahaOutFileDtl, VehicleOrderInspectionDetails, PaymentDocs, EmployeeMaster, FuelUsageRateMasters,
        smsNotificationHistory, FuelPriceMasters, LaneMasters, PurposeMasters, PlantMasters, CountryItcMasters, MAHAPassLog, orderTypeSequences, TermsConditionMasters,
        ServiceRequirementMasters, CorrectionalProcedureMasters, emailNotificationHistory, TestTypeMasters,
        TestResultsModifiedHeader, TestResultsModifiedDetail, TestResModifiedAttachs, TestResModifiedComm, ModifiedResultSubType, orderSyncLog, VehicleTypeMasterSyncLog, AnprPlantLaneConfigs, InspectionLinesApprovalHistory, TestResultsVisual, TestResultsVisualDetail, SmsMasters } = db.entities;

    service.on("getUserInfo", (req) => {
        const fullName = [req.user.attr?.given_name, req.user.attr?.family_name]
            .filter(Boolean)
            .join(" ");

        return {
            id: req.user.id,
            email: req.user.attr?.email || req.user.id,
            name: fullName || req.user.id
        };
    });

    /***********************************************************
    *  Method to fetch vehicle datails from ITC Mobility 
    ***********************************************************/
    service.on('getVehicleDetailsFromITC', async (req) => {
        try {
            const Payload = req.data;
            let oPayload = Payload.Payload.getVehicleDetails;
            oPayload.Header.transactionId = uuid();
            oPayload.Header.btpApp = ReturnConstants().itcConstants.cBtpApp;

            if (oPayload.getVehicleDetailsRequest.request.ChassisNo) {
                delete oPayload.getVehicleDetailsRequest.request.PlateInfo;
            }

            var oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            var aITCVehicleData = await oConnectionPost.post(ReturnConstants().destinationCLM.cGetVehicleDetails, oPayload)

            //this is as per the ITC Response 
            let oErrorMessage = aITCVehicleData?.getVehicleDetailsResponse?.getVehicleDetailsResponse?.getVehicleDetailsErrorHeader?.ErrorHeader;
            if (oErrorMessage) {
                return oErrorMessage;
            } else {
                // Vehicle data returned from ITC
                let oData = await GeneratePayloadVehicleDetail(aITCVehicleData.getVehicleDetailsResponse.getVehicleDetailsResponse.getVehicleDetailsResponse.getVehicleDetailsResult);

                //#region Verify customer data.
                let oCustomerData = await SELECT.one.from(CustomerMasters).where({ emiratesId: oData.customerInfo.emiratesId });
                if (!oCustomerData) {

                    //Customer data does not exist. Insert data.
                    let oCustomerPayload = oData.customerInfo;
                    oCustomerData = await INSERT.into(CustomerMasters).entries(oCustomerPayload);
                }
                else {
                    //Customer data exist.
                    oData.customerInfo = oCustomerData;
                }
                //#endregion

                //#region Verify Vehicle data. 
                let oVehicleData = await SELECT.one.from(VehicleMasters).where({ chasisNumber: oData.chasisNumber, engineNumber: oData.engineNumber });

                if (!oVehicleData) {
                    delete oData.customerInfo;
                    //insert vehicle data.

                    oData.customerMasters_customerUUID = oCustomerData.customerUUID;
                    oVehicleData = await INSERT.into(VehicleMasters).entries(oData);
                    oData.customerInfo = oCustomerData;

                } else {

                    //Vehicle data found
                    oData.vehicleMastersUUID = oVehicleData.vehicleMastersUUID;
                }
                //#endregion

                return oData;
            }
        } catch (error) {
            throw req.error('VEHICLEDETAILSFROMITCCATCH' + error.message);
        }
    });

    /***********************************************************
     *  Generate vehicle Details payload according to the standard API.
     ***********************************************************/
    async function GeneratePayloadVehicleDetail(oPayload) {
        try {
            /* For now, we are getting customer data from the BTP table because data is not available from ITC. */
            let oCustomerData = await SELECT.one.from(CustomerMasters).where({ emiratesId: ReturnConstants().cEmiratesId.emiratesId });
            let oData = {
                vehicleMastersUUID: oPayload.vehicleMastersUUID,
                bodyColorArabic: oPayload.ColorArabicDesc,
                bodyColorCode: oPayload.ColorCode,
                bodyColorEnglish: oPayload.ColorEnglishDesc,
                chasisNumber: oPayload.ChassisNo,
                emptyWeight: oPayload.WeightEmpty,
                engineNumber: oPayload.EngineNo,
                fuelTypeArabic: oPayload.FuelArabicDesc,
                fuelTypeCode: oPayload.FuelCode,
                fuelTypeEnglish: oPayload.FuelEnglishDesc,
                fullWeight: oPayload.WeightFull,
                gearTypeArabic: oPayload.GearArabicDesc,
                gearTypeCode: oPayload.GearCode,
                gearTypeEnglish: oPayload.GearEnglishDesc,
                horsePower: oPayload.HorsePower,
                insuranceExpiry: oPayload.InsuranceExpiryDate,
                insuranceKindArabi: oPayload.InsuranceKindArabicDesc,
                insuranceKindEnglish: oPayload.InsuranceKindEnglishDesc,
                insuranceName: oPayload.InsuranceCompanyName,
                insurancePolicyNumber: oPayload.InsurancePolicyNo,
                kindArabic: oPayload.KindArabicDesc,
                kindCode: oPayload.KindCode,
                kindEnglish: oPayload.KindEnglishDesc,
                manfacturerArabic: oPayload.MakeArabicDesc,
                manfacturerCode: oPayload.MakeCode,
                manfacturerEnglish: oPayload.MakeEnglishDesc,
                modelArabic: oPayload.ModelArabicDesc,
                modelCode: oPayload.ModelCode,
                modelEnglish: oPayload.ModelEnglishDesc,
                nationalityCode: oPayload.NationalityCode,
                nationalityEnglish: oPayload.NationalityEnglishDesc,
                nationalityArabic: oPayload.NationalityArabicDesc,
                numberOfAxel: oPayload.AxisCount,
                numberOfCylinders: oPayload.Cylinder,
                numberOfDoors: oPayload.DoorCount,
                numberOfPassengers: oPayload.Chairs,
                numberOfWheels: oPayload.WheelsCount,
                ownerTcfNumber: oPayload.OwnerTcfNo,
                plateColorCode: oPayload.PlateInfo.PlateColorCode,
                plateKindCode: oPayload.PlateInfo.PlateKindCode,
                plateNumber: oPayload.PlateInfo.PlateNo,
                plateSourceCode: oPayload.PlateInfo.PlateSourceCode,
                plateTypeCode: oPayload.PlateInfo.PlateTypeCode,
                registrationDate: oPayload.RegistrationDate,
                registrationExpiryDate: oPayload.RegistrationExpiryDate,
                registrationYear: oPayload.Year,
                steeringSideArabic: oPayload.SteeringArabicDesc,
                steeringSideCode: oPayload.SteeringCode,
                steeringSideEnglish: oPayload.SteeringEnglishDesc,
                typeArabic: oPayload.TypeArabicDesc,
                typeCode: oPayload.TypeCode,
                typeEnglish: oPayload.TypeEnglishDesc,
                weightDiscArabic: oPayload.WeightArabicDesc,
                weightDiscCode: oPayload.WeightCode,
                weightDiscEnglish: oPayload.WeightEnglishDesc,
                IsClassicVehicle: oPayload.IsClassicVehicle,
                IsHandicappedVehicle: oPayload.IsHandicappedVehicle,
                IsModifiedVehicle: oPayload.IsModifiedVehicle,
                IsClassicForShow: oPayload.IsClassicForShow,
                manufacturingYear: oPayload.Year,
                customerInfo: oCustomerData
            }

            //Fetch PlateKind.
            let oPlateKind = await SELECT.one.from(VehPlateKindMasters).where({ codeId: oPayload.PlateInfo.PlateKindCode });
            oData.plateKindArabic = oPlateKind.codeDescArabic;
            oData.plateKindEnglish = oPlateKind.codeDescEnglish;

            //Fetch PlateColor.
            let oPlateColor = await SELECT.one.from(VehPlateColorMasters).where({ codeId: oPayload.PlateInfo.PlateColorCode });
            oData.plateColorArabic = oPlateColor.codeDescArabic;
            oData.plateColorEnglish = oPlateColor.codeDescEnglish;

            //Fetch PlateSource.
            let oPlateSource = await SELECT.one.from(VehPlateSourceMasters).where({ codeId: oPayload.PlateInfo.PlateSourceCode });
            oData.plateSourceArabic = oPlateSource.codeDescArabic;
            oData.plateSourceEnglish = oPlateSource.codeDescEnglish;

            return oData
        } catch (error) {
            throw 'PAYLOADVEHICLEDETAIL' + error.message;
        }
    }

    /***********************************************************
    *  Method to fetch data from BTP vehicle datail
    ***********************************************************/
    service.on('getVehicleDetailsFromBTP', async (req) => {
        try {
            const { FilterDetail } = req.data;
            let oCondition = null;

            if (FilterDetail.ChassisNo) {
                oCondition = {
                    chasisNumber: FilterDetail.ChassisNo
                }
            } else {
                oCondition = {
                    plateNumber: FilterDetail.PlateNo,
                    plateColorCode: FilterDetail.PlateColorCode,
                    plateKindCode: FilterDetail.PlateKindCode,
                    plateSourceCode: FilterDetail.PlateSourceCode,
                }
            }
            const cResult = await SELECT.one.from(VehicleMasters).where(oCondition);

            if (!cResult) {
                const errorMessage = {
                    Code: ReturnConstants().ErrorCode.NotFound,
                    Message: ReturnConstants().ErrorValiddation.ErrorVehcileNotFound
                }
                return errorMessage;
            }

            const customerData = await SELECT.one.from(CustomerMasters).where({ customerUUID: cResult.customerMasters_customerUUID });

            if (customerData) {
                cResult.customerInfo = {

                    BPGrouping: customerData.BPGrouping,
                    customerUUID: customerData.customerUUID,
                    emailAddress: customerData.emailAddress,
                    emiratesId: customerData.emiratesId,
                    extReference: customerData.extReference,
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                    mobileNo: customerData.mobileNo,
                    region: customerData.region,
                    customerType: customerData.customerType,
                    emiratesFromDate: customerData.emiratesFromDate,
                    emiratesToDate: customerData.emiratesToDate,
                    idType: customerData.idType,
                    commTypeWhatsapp: customerData.commTypeWhatsapp,
                    commTypeMail: customerData.commTypeMail,
                    commTypeSMS: customerData.commTypeSMS,
                }
            } else {
                const errorMessage = {
                    Code: ReturnConstants().ErrorCode.NotFound,
                    Message: ReturnConstants().ErrorValiddation.ErrorVehcileNotFound
                }
                return errorMessage;
            }
            return cResult;
        } catch (error) {
            throw req.error('ERRORDETAILSFROMBTP' + error.message);
        }
    }
    );

    /***********************************************************
    *  Method to fetch data from comprehensive Master
    ***********************************************************/
    service.on('fetchComprehensiveData', async (req) => {

        try {

            // fetch few columns from Comprehensive master data
            const apartialComprehensiveData = await SELECT.distinct
                .from(TestTypeMasters)
                .columns(
                    "testText",
                    "testTextNo",
                    "testMainTypeNo",
                    "testMainTypeTextEnglish",
                    "testMainTypeTextArabic",
                    "controlTypeValueLabel1",
                    "controlTypeValueLabel2",
                    "controlTypeValueLabel3",
                    "controlTypeValueLabel4",
                    "examinationMethodEnglish",
                    "examinationMethodArabic"
                )
                .where({
                    testText: ReturnConstants().cComprehensive.cTestText,
                    testTextNo: ReturnConstants().cComprehensive.cTestTextNo
                })
                .orderBy({ testMainTypeNo: ReturnConstants().cComprehensive.cOrderBy });
            if (!apartialComprehensiveData.length) {
                return req.error(ReturnConstants().ErrorCode.NotFound, 'MESSAGE');
            }

            // fetch all columns from Comprehensive master data
            const afullComprehensiveData = await SELECT.from(TestTypeMasters).where({ testText: ReturnConstants().cComprehensive.cTestText, testTextNo: ReturnConstants().cComprehensive.cTestTextNo }).orderBy({ testMainTypeNo: ReturnConstants().cComprehensive.cOrderBy });

            // fetch combinations for comprehensive master data
            const aCombinationData = await SELECT.from(TestTypeCombinationMaster)

            let aResponseArray = [];
            apartialComprehensiveData.forEach(parent => {
                let aChildData = {};
                let testMainType = parent.testMainTypeTextEnglish;

                // form comprehensive data result set - child level 1 (controlType information) //Remove 
                let aComprehensiveDataControlInfo = [...new Set(afullComprehensiveData
                    .filter(row => row.testMainTypeTextEnglish === testMainType)
                    .map(row => JSON.stringify({
                        id: uuid(),
                        "testSubTypeNo": row.testSubTypeNo,
                        "testSubTypeTextEnglish": row.testSubTypeTextEnglish,
                        "testSubTypeTextArabic": row.testSubTypeTextArabic,
                        "controlType1": row.controlType1,
                        "controlType2": row.controlType2,
                        "controlType3": row.controlType3,
                        "controlType4": row.controlType4,
                        "controlType5": row.controlType5,
                        "controlType6": row.controlType6,
                        "controlTypeValueLabel1": false,
                        "controlTypeValueLabel2": false,
                        "controlTypeValueLabel3": row.controlTypeValueLabel3,
                        "controlTypeValueLabel4": row.controlTypeValueLabel4,
                        "controlTypeValueLabel5": row.controlTypeValueLabel5,
                        "controlTypeValueLabel6": row.controlTypeValueLabel6,
                        "conditionalMappingMasterCode": row.conditionalMappingMasterCode
                    }))
                )].map(str => JSON.parse(str));

                // form comprehensive data result set - child level 2 (combination information)                
                aComprehensiveDataControlInfo.forEach(testMasterRow => {
                    testMasterRow[ReturnConstants().cComprehensive.cChildSubCategory] = aCombinationData
                        .filter(comb => comb.testTypeKey === testMasterRow.conditionalMappingMasterCode)
                        .map(comb => ({
                            "testTypeMaster": comb.testTypeMaster_testTypeUUID,
                            "testTypeCombinationUUID": comb.testTypeCombinationUUID,
                            "testTypeNo": comb.testTypeNo,
                            "testTypeTextEnglish": comb.testTypeTextEnglish,
                            "testTypeTextArabic": comb.testTypeTextArabic,
                            'Selected': false

                        }));
                });

                aChildData[ReturnConstants().cComprehensive.cSubCategory] = aComprehensiveDataControlInfo;

                // create a response dataset of complete Comprehensive Data 
                let response = {
                    "testTextNo": parent.testTextNo,
                    "testText": parent.testText,
                    "testMainTypeNo": parent.testMainTypeNo,
                    "testMainType": testMainType,
                    "testMainTypeTextArabic": parent.testMainTypeTextArabic,
                    "controlTypeValueLabel1": parent.controlTypeValueLabel1,
                    "controlTypeValueLabel2": parent.controlTypeValueLabel2,
                    "controlTypeValueLabel3": parent.controlTypeValueLabel3,
                    "controlTypeValueLabel4": parent.controlTypeValueLabel4,
                    "examinationMethodEnglish": parent.examinationMethodEnglish,
                    "examinationMethodArabic": parent.examinationMethodArabic,
                    ...aChildData
                };

                aResponseArray.push(response);
            });

            return { aResponseArray };

        }

        catch (error) {
            throw req.error(ReturnConstants().ErrorCode.InternalServer, 'ERRORMESSAGEFETCHINGCOMPREHENSIVEDATA' + error.message);
        }

    });

    /***********************************************************
              *  Method to fetch Traffic Data
    ***********************************************************/
    service.on('fetchTrafficData', async (req) => {
        try {
            // Fetch distinct parent-level Traffic test data
            const aTestDataDistinct = await SELECT.distinct.from(TestTypeMasters)
                .columns(
                    "testText",
                    "testTextNo",
                    "testMainTypeNo",
                    "testMainTypeTextEnglish",
                    "controlTypeValueLabel1",
                    "controlTypeValueLabel2",
                    "controlTypeValueLabel3",
                    "controlTypeValueLabel4"
                )
                .where({
                    testText: ReturnConstants().cTrafficTest.cTestText,
                    testTextNo: ReturnConstants().cTrafficTest.cTestTextNo
                })
                .orderBy({ testMainTypeNo: ReturnConstants().cTrafficTest.cOrderBy });

            if (!aTestDataDistinct.length) {
                return req.error(ReturnConstants().ErrorCode.NotFound, 'MESSAGEFORTRAFFICTEST');
            }

            // Fetch full Traffic test dataset with subtypes
            const aTestDataFull = await SELECT.from(TestTypeMasters)
                .where({ testText: ReturnConstants().cTrafficTest.cTestText })
                .orderBy({ testMainTypeNo: ReturnConstants().cTrafficTest.cOrderBy });

            const aResponseArray = [];

            aTestDataDistinct.forEach(oParent => {
                const aGroupedSubTypes = aTestDataFull
                    .filter(oRow => oRow.testMainTypeTextEnglish === oParent.testMainTypeTextEnglish)
                    .map(oRow => ({
                        "test Sub Type No": oRow.testSubTypeNo,
                        "testSubTypeTextEnglish": oRow.testSubTypeTextEnglish,
                        "testSubTypeTextArabic": oRow.testSubTypeTextArabic,
                        "controlType1": oRow.controlType1,
                        "controlType2": oRow.controlType2,
                        "controlType3": oRow.controlType3,
                        "controlType4": oRow.controlType4,
                        "controlType5": oRow.controlType5,
                        "controlType6": oRow.controlType6,
                        "controlTypeValueLabel1": oRow.controlTypeValueLabel1,
                        "controlTypeValueLabel1Text": oRow.controlTypeValueLabel1,
                        "controlTypeValueLabel2": oRow.controlTypeValueLabel2,
                        "controlTypeValueLabel2Text": oRow.controlTypeValueLabel2,
                        "controlTypeValueLabel3": oRow.controlTypeValueLabel3,
                        "controlTypeValueLabel3Text": oRow.controlTypeValueLabel3,
                        "controlTypeValueLabel4": oRow.controlTypeValueLabel4,
                        "controlTypeValueLabel4Text": oRow.controlTypeValueLabel4,
                        "controlTypeValueLabel5": oRow.controlTypeValueLabel5,
                        "controlTypeValueLabel5Text": oRow.controlTypeValueLabel5,
                        "controlTypeValueLabel6": oRow.controlTypeValueLabel6,
                        "controlTypeValueLabel6Text": oRow.controlTypeValueLabel6,
                        "conditionalMappingMasterCode": oRow.conditionalMappingMasterCode
                    }));

                const oParentMatch = aTestDataFull.find(oRow => oRow.testMainTypeTextEnglish === oParent.testMainTypeTextEnglish);

                const oResponse = {
                    "testTextNo": oParent.testTextNo,
                    "testText": oParent.testText,
                    "testMainTypeNo": oParent.testMainTypeNo,
                    "testMainTypeTextEnglish": oParent.testMainTypeTextEnglish,
                    "testMainTypeTextArabic": oParentMatch?.testMainTypeTextArabic || ReturnConstants().cTrafficTest.cTestMainTypeTextArabic,
                    "headerTypeValueLabel1": oParent.controlTypeValueLabel1,
                    "headerTypeValueLabel2": oParent.controlTypeValueLabel2,
                    "headerTypeValueLabel3": oParent.controlTypeValueLabel3,
                    "headerTypeValueLabel4": oParent.controlTypeValueLabel4,
                    "SubCategory": aGroupedSubTypes
                };

                aResponseArray.push(oResponse);
            });
            return { aResponseArray };
        } catch (oError) {
            throw req.error(ReturnConstants().ErrorCode.InternalServer, 'ERRORMESSAGEFETCHINGTRAFFICDATA' + oError.message);
        }
    });

    /***********************************************************
                *  Method to MAHA_ESIN Es-In Generate 
    ***********************************************************/
    service.on('MahaEsInGenerate', async (req) => {
        try {

            let oInputData = req.data;
            let sPlantCode = oInputData.plantCode;
            let sServiceRequestNo = oInputData.serviceRequestNo;
            let sOrderLineNumber = oInputData.orderLineNo;
            let oVehicleMasterData = oInputData.vehicleDetails;
            let sVehicleOrderInspectionLinesTestCharUUID = oInputData.VehicleOrderInspectionLinesTestCharUUID;

            let aListFreshTestMahaCode = await SELECT.from(MahaConfigurations)
                .where({ mahaType: ReturnConstants().testType.cESIN })
                .orderBy({ sequenceNumber: ReturnConstants().testType.cOrderby });

            let sEsInFileName = `${sPlantCode}_${sServiceRequestNo}_${sOrderLineNumber}.${ReturnConstants().maha.fileExtTxt}`;
            let sContent = "";
            // Loop through each mapping definition
            for (let item of aListFreshTestMahaCode) {
                let { fieldSourceTable, fieldSourceName, mahaFieldCode, fieldSourceValue } = item;
                let value = "";

                try {
                    // Case 1: Vehicle Master Table → pull directly from database
                    if (fieldSourceTable === ReturnConstants().maha.vehicleMasterTable) {
                        if (oVehicleMasterData.hasOwnProperty(fieldSourceName)) {
                            value = oVehicleMasterData[fieldSourceName] ?? "";
                            if (value === ReturnConstants().maha.valueNA || value === null || value === undefined) {
                                value = "";
                            }
                            sContent += `${mahaFieldCode}=${value}\r\n`;
                        }
                    }
                    // Special rule for default table when mahaFieldCode is empty
                    if ((!mahaFieldCode || mahaFieldCode.trim() === "")
                        && fieldSourceTable === ReturnConstants().maha.default) {
                        value = fieldSourceValue;

                        sContent += `${value}\r\n`;
                    }
                    else if (fieldSourceTable === ReturnConstants().maha.default) {
                        value = fieldSourceValue;
                        sContent += `${mahaFieldCode}=${value}\r\n`;

                    }
                } catch (err) {
                    throw req.error('ERRORMAHAFIELDTABLE' + err.message);
                }
            }

            const buffer = Buffer.from(sContent, 'utf-8');
            let sBase64Content = buffer.toString(ReturnConstants().maha.default.cBase64);

            let oMahaEsInPayload = {
                Site_no: sPlantCode,
                File_name: sEsInFileName,
                File_Content: sBase64Content,
                fileUploadPath: "",
                btpApp: ReturnConstants().itcConstants.cBtpApp
            };

            let oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            let aResMahaEsIn = await oConnectionPost.post(ReturnConstants().destinationCLM.cSapBtpToMahaEsIn, oMahaEsInPayload);

            let sResponseMessage = aResMahaEsIn.responseStatus.statusMsg;
            // Check maha EsIn api response status
            if (sResponseMessage == ReturnConstants().apiResponse.cSuccess) {

                await UPDATE('VehicleOrderInspectionLinesTestChar')
                    .set({
                        testStatus: ReturnConstants().testStatus.cCompleted,
                        testComments: ReturnConstants().testAdditionalInfo.cComment,
                        testInspectedBy: ReturnConstants().testAdditionalInfo.cInspector,
                        testInspectionStartDate: new Date(),
                        testInspectionEndDate: new Date()
                    })
                    .where({ VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID });

                let oESINDetailResPayload = {
                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID,
                    Type: ReturnConstants().testType.cESIN,
                    startDate: new Date(),
                    completedDate: new Date(),
                    attachmentData: sBase64Content,
                    attachmentName: sEsInFileName,
                    inUse: true
                };

                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                return {
                    responseStatus: {
                        statusCode: ReturnConstants().maha.cCode,
                        statusMsg: ReturnConstants().maha.messageESINGenerate
                    }
                };
            }
            else {
                // If maha es_in give error then insert error into table
                let sResponseMessage = aResMahaEsIn.responseStatus.errorDetails[0].message;
                let oESINDetailResPayload = {
                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID,
                    Type: ReturnConstants().testType.cESIN,
                    startDate: new Date(),
                    attachmentData: sBase64Content,
                    attachmentName: sEsInFileName,
                    inUse: true,
                    isError: true,
                    errorDesc: sResponseMessage
                };

                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                return {
                    responseStatus: {
                        statusCode: ReturnConstants().maha.responseStatus.statusCode,
                        statusMsg: sResponseMessage
                    }
                };
            }
        } catch (error) {
            throw req.error('ERRORMAHAESIN' + error.message);
        }
    });

    /***********************************************************
    *  Before Update updating the OrderLineNo for Sales order
    ***********************************************************/
    service.before('UPDATE', 'VehicleOrderInspections', async (req) => {
        try {
            // Check if VehOrdInspDetails is passed in the payload
            if (req.data.VehOrdInspDetails && Array.isArray(req.data.VehOrdInspDetails)) {
                // Step 1: Find the current highest orderLineNo across all lines
                let maxOrderLineNo = 0;

                for (const vehicle of req.data.VehOrdInspDetails) {
                    if (vehicle.vehOrdInspLines && Array.isArray(vehicle.vehOrdInspLines)) {
                        for (const line of vehicle.vehOrdInspLines) {
                            if (line.orderLineNo && !isNaN(line.orderLineNo)) {
                                maxOrderLineNo = Math.max(maxOrderLineNo, Number(line.orderLineNo));
                            }
                        }
                    }
                }

                // Step 2: Start numbering from next 10 after the highest found
                let iOrderLineNumber = maxOrderLineNo ? maxOrderLineNo + 10 : 10;

                for (const vehicle of req.data.VehOrdInspDetails) {
                    if (vehicle.vehOrdInspLines && Array.isArray(vehicle.vehOrdInspLines)) {
                        for (const line of vehicle.vehOrdInspLines) {
                            // If orderLineNo is missing or invalid, assign a new one
                            if (!line.orderLineNo || isNaN(line.orderLineNo)) {
                                line.orderLineNo = iOrderLineNumber;
                                line.LineIndicator = ReturnConstants().testStatus.ncS4Indictor;
                                iOrderLineNumber += 10;
                            }
                        }
                    }
                }
            }

        } catch (Error) {
            throw req.error('VEHICLESEQCREATEERROR' + Error.message);
        }
    });

    /***********************************************************
    *  Before Create generate Sequence Number for Sales order
    ***********************************************************/
    service.before('CREATE', 'VehicleOrderInspections', async (req) => {
        try {
            //"sequences"
            let sequenceName = await cds.run(SELECT.from(orderTypeSequences).columns(
                ReturnConstants().sequences.orderTypeSequencesColumn
            ).where({ orderType: req.data.orderType }));
            let orderSequenceNumber = sequenceName[0] ? sequenceName[0].sequences : ReturnConstants().sequences.cServiceRequestNum;
            var sequenceNumber = new VehicleSequenceGenerator({
                db: db,
                sequence: orderSequenceNumber,
                table: VehicleOrderInspections,
                field: ReturnConstants().sequences.cServiceRequestNo
            });

            req.data.serviceRequestNo = await sequenceNumber.getNextNumber();

            // Validate Plant code
            if (req.data.plantCode == null || req.data.plantCode == '') {
                req.error(ReturnConstants().cGeneralError.c400, ReturnConstants().cGeneralError.cPlantCodeMissing);
                return;
            }

            // Validate data 
            const { VehOrdInspDetails } = req.data;
            VehOrdInspDetails.forEach((detail, i) => {

                // Validate Plant code
                if (!detail.plantCode || detail.plantCode.trim() === '') {
                    req.error(ReturnConstants().cGeneralError.c400, ReturnConstants().cGeneralError.cPlantCodeMissing)
                }

                // Validate Lane Code
                if (!detail.laneCode || detail.laneCode.trim() === '') {
                    req.error(ReturnConstants().cGeneralError.c400, ReturnConstants().cGeneralError.cLaneCodeMissing)
                }

                // Loop and Validate Material Code 
                detail.vehOrdInspLines.forEach((line, j) => {

                    // Validate Material Code
                    if (!line.materialCode || line.materialCode.toString().trim() === '') {
                        req.error(ReturnConstants().cGeneralError.c400, ReturnConstants().cGeneralError.cMaterialCodeMissing)
                    }
                })

            });

            // Set Line Number for each material in Sales order
            if (req.data.VehOrdInspDetails && Array.isArray(req.data.VehOrdInspDetails)) {
                let iOrderLineNumber = 1;
                for (const vehicle of req.data.VehOrdInspDetails) {
                    if (vehicle.vehOrdInspLines && Array.isArray(vehicle.vehOrdInspLines)) {
                        for (const line of vehicle.vehOrdInspLines) {
                            line.orderLineNo = iOrderLineNumber * 10;
                            line.LineIndicator = ReturnConstants().testStatus.ncS4Indictor;
                            iOrderLineNumber++;
                        }
                    }
                }
            }

        } catch (Error) {
            throw req.error('VEHICLESEQCREATEERROR' + Error.message);
        }
    });

    /***********************************************************
    *  Method to Get Test Result Traffic By UUID
    ***********************************************************/
    service.on('getTestResultTrafficById', async (req) => {

        try {
            const { VehicleOrderInspectionLinesTestCharUUID } = req.data;

            const TraficResult = await SELECT.distinct.from(TestResultsTraffic).columns(
                "testMainTypeTextEnglish",
                "testMainTypeTextArabic",
                "testMainTypeNo"
            ).where({ vehicleOrderInspectionLinesTestChar: VehicleOrderInspectionLinesTestCharUUID }).orderBy({ testMainTypeNo: ReturnConstants().cTrafficTest.cOrderBy });


            const enrichedResults = [];
            for (const parentRow of TraficResult) {

                const childRows = await SELECT.from(TestResultsTraffic).columns(
                    "testSubTypeTextEnglish",
                    "testSubTypeTextArabic",
                    "controlTypeValueLabel1Flag",
                    "controlTypeValueLabel1Text",
                    "controlTypeValueLabel2Flag",
                    "controlTypeValueLabel2Text",
                    "controlTypeValueLabel3Flag",
                    "controlTypeValueLabel3Text",
                    "controlTypeValueLabel4Flag",
                    "controlTypeValueLabel4Text"
                ).where({ vehicleOrderInspectionLinesTestChar: VehicleOrderInspectionLinesTestCharUUID, testMainTypeNo: parentRow.testMainTypeNo }).orderBy({ testMainTypeNo: ReturnConstants().cTrafficTest.cOrderBy });

                const formattedChildRows = childRows.map(row => ({
                    testSubTypeTextEnglish: row.testSubTypeTextEnglish,
                    testSubTypeTextArabic: row.testSubTypeTextArabic,
                    controlTypeValueLabel1: row.controlTypeValueLabel1Flag ? ReturnConstants().cTrafficTest.cYes : ReturnConstants().cTrafficTest.cNo,
                    controlTypeValueLabel1Text: row.controlTypeValueLabel1Text,
                    controlTypeValueLabel2: row.controlTypeValueLabel2Flag ? ReturnConstants().cTrafficTest.cYes : ReturnConstants().cTrafficTest.cNo,
                    controlTypeValueLabel2Text: row.controlTypeValueLabel2Text,
                    controlTypeValueLabel3: row.controlTypeValueLabel3Flag ? ReturnConstants().cTrafficTest.cYes : ReturnConstants().cTrafficTest.cNo,
                    controlTypeValueLabel3Text: row.controlTypeValueLabel3Text,
                    controlTypeValueLabel4: row.controlTypeValueLabel4Flag ? ReturnConstants().cTrafficTest.cYes : ReturnConstants().cTrafficTest.cNo,
                    controlTypeValueLabel4Text: row.controlTypeValueLabel4Text,
                }));

                enrichedResults.push({
                    ...parentRow,
                    SubCategory: formattedChildRows
                });

            }
            return enrichedResults;

        } catch (Error) {
            throw req.error('UPDATEERRORMESSAGE' + Error.message);
        }
    });

    /***********************************************************
    *  Method to Delete Test Result Comprehensive
    ***********************************************************/
    service.on('deleteTestResultComprehensive', async (req) => {
        try {
            const { sVehicleOrderInspectionLinesTestCharGUID } = req.data;
            const resopnceData = await cds.run(DELETE.from('TestResultsComprehensive').where({ vehicleOrderInspectionLinesTestChar: { '=': sVehicleOrderInspectionLinesTestCharGUID } }))
            return resopnceData;
        } catch (Error) {
            throw req.error('UPDATEERRORMESSAGE' + Error.message);
        }
    });


    /*************************************************************
    * Method to fetch data from comprehensive Results Master
    **************************************************************/
    service.on('getTestResultComprehensiveById', async (req) => {

        try {
            const { VehicleOrderInspectionLinesTestCharUUID } = req.data;

            const aTraficResult = await SELECT.distinct.from(TestResultsComprehensive).columns(
                { testMainTypeTextEnglish: 'testMainType' },
                "testMainTypeNo",
                "controlTypeValueLabel1",
                "controlTypeValueLabel2",
                "testMainTypeTextArabic"
            ).where({ vehicleOrderInspectionLinesTestChar: VehicleOrderInspectionLinesTestCharUUID }).orderBy({ testMainTypeNo: ReturnConstants().cComprehensive.cOrderBy });

            const aResponseArray = [];
            let aApiResults = [];
            for (const parentRow of aTraficResult) {

                const childRows = await SELECT.from(TestResultsComprehensive).columns(
                    "TestResultsComprehensiveUUID",
                    "testSubTypeTextEnglish",
                    "testSubTypeTextArabic",
                    "controlTypeValueLabel1Flag",
                    "controlTypeValueLabel2Flag",
                    "conditionalMappingMasterCode",
                    "compResSubTypesText"
                ).where({ vehicleOrderInspectionLinesTestChar: VehicleOrderInspectionLinesTestCharUUID, testMainTypeNo: parentRow.testMainTypeNo }).orderBy({ testMainTypeNo: ReturnConstants().cComprehensive.cOrderBy });

                const oFormattedChildRows = childRows.map(row => ({
                    TestResultsComprehensiveUUID: row.TestResultsComprehensiveUUID,
                    testSubTypeTextEnglish: row.testSubTypeTextEnglish,
                    testSubTypeTextArabic: row.testSubTypeTextArabic,
                    controlTypeValueLabel1: row.controlTypeValueLabel1Flag ? true : false,
                    controlTypeValueLabel2: row.controlTypeValueLabel2Flag ? true : false,
                    conditionalMappingMasterCode: row.conditionalMappingMasterCode,
                    compResSubTypesText: row.compResSubTypesText,
                    ChildSubCategory: []
                }));

                aResponseArray.push({
                    ...parentRow,
                    SubCategory: oFormattedChildRows
                });

            }

            for (const Item of aResponseArray) {
                for (const SubChild of Item.SubCategory) {
                    const cDeepChild = await cds.run(
                        SELECT.from('ComprehensiveResultSubType')
                            .columns(
                                'TestResultsComprehensiveUUID',
                                'testTypeKey',
                                'testTypeTextEnglish',
                                'testTypeTextArabic',
                                { true: 'Selected' }
                            )
                            .where({ testResultsComprehensive: SubChild.TestResultsComprehensiveUUID })
                    );

                    aApiResults.push({
                        TestResultsComprehensiveUUID: SubChild.TestResultsComprehensiveUUID,
                        cDeepChildResults: cDeepChild
                    });
                }
            }

            aResponseArray.forEach(item => {
                item.SubCategory.forEach(subChild => {
                    const match = aApiResults.find(apiItem => apiItem.TestResultsComprehensiveUUID === subChild.TestResultsComprehensiveUUID);

                    if (match) {
                        subChild.ChildSubCategory = match.cDeepChildResults;
                    } else {
                        subChild.cDeepChildResults = [];
                    }
                });
            });
            return aResponseArray;
        }
        catch (Error) {
            throw req.error('GETERRORMESSAGE' + Error.message);
        }
    });

    /*************************************************************
    * Method to fetch data from modifed Results Master
    **************************************************************/

    service.on('getTestResultModifiedById', async (req) => {
        try {
            const { VehicleOrderInspectionLinesTestCharUUID } = req.data;

            // 1️⃣ Fetch the single header
            const aHeaders = await SELECT.from(TestResultsModifiedHeader).columns(
                'TestResultsModifiedHeaderUUID',
                'horsepowerCurrent',
                'horsepowerFactory',
                'horsepowerPercentage',
                'horsepowerCallStage',
                'horsepowerFinalStage'
            ).where({ vehicleOrderInspectionLinesTestChar: VehicleOrderInspectionLinesTestCharUUID });

            if (!aHeaders.length) return null;
            const header = aHeaders[0];

            // 2️⃣ Fetch all details for this header
            const aDetails = await SELECT.from(TestResultsModifiedDetail).columns(
                'TestResultsModifiedUUID',
                'testResultsModifiedHeader_TestResultsModifiedHeaderUUID',
                'testMainTypeSrNo',
                'testMainTypeNo',
                'testMainTypeTextEnglish',
                'testMainTypeTextArabic',
                'testSubTypeNo',
                'testSubTypeTextEnglish',
                'testSubTypeTextArabic',
                'childSubTypeNo',
                'childSubTypeTextEnglish',
                'childSubTypeTextArabic',
                'examinationMethodEnglish',
                'examinationMethodArabic',
                'controlTypeValueLabel1Flag',
                'controlTypeValueLabel2Flag',
                'modifyStageCode',
                'modifyStageDesc'
            ).where({ testResultsModifiedHeader_TestResultsModifiedHeaderUUID: header.TestResultsModifiedHeaderUUID })
                .orderBy({ testMainTypeSrNo: ReturnConstants().cGetTestResultModifiedById.cOrderBy });

            const aDetailUUIDs = aDetails.map(d => d.TestResultsModifiedUUID);

            // 3️⃣ Fetch attachments and comments for all details
            const aAttachs = await SELECT.from(TestResModifiedAttachs).columns(
                'testResModAttId',
                'testResultsModifiedDetail_TestResultsModifiedUUID',
                'testMainTypeSrNo',
                'testMainTypeNo',
                'testSubTypeNo',
                'uploadedDate',
                'uploadedTime',
                'DisplayName',
                'AttachmentId_attachmentGuId'
            ).where({ testResultsModifiedDetail_TestResultsModifiedUUID: aDetailUUIDs });

            const aComments = await SELECT.from(TestResModifiedComm).columns(
                'testResModCommId',
                'testResultsModifiedDetail_TestResultsModifiedUUID',
                'testMainTypeSrNo',
                'testMainTypeNo',
                'Comments'
            ).where({ testResultsModifiedDetail_TestResultsModifiedUUID: aDetailUUIDs });

            // 4️⃣ Map attachments and comments by detail UUID
            const mAttachMap = {};
            aAttachs.forEach(att => {
                const key = att.testResultsModifiedDetail_TestResultsModifiedUUID;
                if (!mAttachMap[key]) mAttachMap[key] = [];
                mAttachMap[key].push({
                    testResModAttId: att.testResModAttId,
                    testMainTypeSrNo: att.testMainTypeSrNo,
                    testMainTypeNo: att.testMainTypeNo,
                    testSubTypeNo: att.testSubTypeNo,
                    uploadedDate: att.uploadedDate,
                    uploadedTime: att.uploadedTime,
                    DisplayName: att.DisplayName,
                    AttachmentId_attachmentGuId: att.AttachmentId_attachmentGuId
                });
            });

            // check attachment validation

            const mCommentMap = {};
            aComments.forEach(comm => {
                const key = comm.testResultsModifiedDetail_TestResultsModifiedUUID;
                if (!mCommentMap[key]) mCommentMap[key] = [];
                mCommentMap[key].push({
                    testResModCommId: comm.testResModCommId,
                    testMainTypeSrNo: comm.testMainTypeSrNo,
                    testMainTypeNo: comm.testMainTypeNo,
                    Comments: comm.Comments
                });
            });

            // 5️⃣ Build SubCategory + ChildSubCategory
            const aResponseArray = aDetails.map(detail => ({
                TestResultsModifiedUUID: detail.TestResultsModifiedUUID,
                testMainTypeSrNo: detail.testMainTypeSrNo,
                testMainTypeNo: detail.testMainTypeNo,
                testMainTypeTextEnglish: detail.testMainTypeTextEnglish,
                testMainTypeTextArabic: detail.testMainTypeTextArabic,
                testSubTypeNo: detail.testSubTypeNo,
                testSubTypeTextEnglish: detail.testSubTypeTextEnglish,
                testSubTypeTextArabic: detail.testSubTypeTextArabic,
                childSubTypeNo: detail.childSubTypeNo,
                childSubTypeTextEnglish: detail.childSubTypeTextEnglish,
                childSubTypeTextArabic: detail.childSubTypeTextArabic,
                examinationMethodEnglish: detail.examinationMethodEnglish,
                examinationMethodArabic: detail.examinationMethodArabic,
                controlTypeValueLabel1Flag: detail.controlTypeValueLabel1Flag,
                controlTypeValueLabel2Flag: detail.controlTypeValueLabel2Flag,
                modifyStageCode: detail.modifyStageCode,
                modifyStageDesc: detail.modifyStageDesc,
                testResModifiedAttachs: mAttachMap[detail.TestResultsModifiedUUID] || [],
                TestResModCom: mCommentMap[detail.TestResultsModifiedUUID] || [],
                ChildSubCategory: [] // placeholder
            }));

            // 6️⃣ Fetch ChildSubCategory for each detail
            for (const detail of aResponseArray) {
                const cDeepChild = await cds.run(
                    SELECT.from('ModifiedResultSubType')
                        .columns(
                            'TestResultsModifiedUUID',
                            'testTypeKey',
                            'testTypeTextEnglish',
                            'testTypeTextArabic',
                            { true: 'Selected' }
                        )
                        .where({ testResultsModified: detail.TestResultsModifiedUUID })
                );
                detail.ChildSubCategory = cDeepChild || [];
            }

            // 7️⃣ Final payload
            return {
                applicableTestName: header.applicableTestName || ReturnConstants().cGetTestResultModifiedById.cVIMODIFIEDTEST,
                testStatus: header.testStatus || ReturnConstants().cGetTestResultModifiedById.cOpen,
                testComments: header.testComments || null,
                testInspectedBy: header.testInspectedBy || null,
                testInspectionStartDate: header.testInspectionStartDate || null,
                testInspectionEndDate: header.testInspectionEndDate || null,
                testResModHdr: [  // always one header
                    {
                        ...header,
                        testResModDtl: aResponseArray
                    }
                ]
            };

        } catch (Error) {
            throw req.error('ERRORFETCHINGMODIFIEDRESULT' + Error.message);
        }
    });

    /***********************************************************
    *  Method to Preview Test Certificate
    ***********************************************************/


    service.on("previewTestCertificate", async (req) => {

        try {
            const { attachmentGuId, serviceRequestNo, plateNo, chasisNumber, testName, orderLineNo, vehicleOrderInspectionLines } = req.data;

            // if attachmentGuId is available then certificate will be fetched from DMS 
            if (attachmentGuId) {
                try {
                    let oAttachRes = await getAttachmentByGuidFromDMSFunc(attachmentGuId);
                    return ({
                        attachmentGuId: null,
                        base64PDF: oAttachRes.base64File
                    });

                } catch (error) {

                    /* when atachementGuid Exist but DMS destination is not available */
                    let sTaxBase64 = await taxInvoicePrint(serviceRequestNo, plateNo, ReturnConstants().TestCertificate.cInvoiceCode)
                    let sCertificateBase64 = await generateBase64Pdf(serviceRequestNo, plateNo, chasisNumber, testName, orderLineNo);
                    let base64PDF = await mergePDFsBase64([sTaxBase64, sCertificateBase64])
                    return {
                        attachmentGuId: null,
                        base64PDF: base64PDF
                    }

                }
            }

            let sTaxBase64 = await taxInvoicePrint(serviceRequestNo, plateNo, ReturnConstants().TestCertificate.cInvoiceCode)
            
            // Attachment GUID is not generated . So call generateBase64Pdf function
            const sCertificateBase64 = await generateBase64Pdf(serviceRequestNo, plateNo, chasisNumber, testName, orderLineNo);
            let base64PDF = await mergePDFsBase64([sTaxBase64, sCertificateBase64])

            //process to Upload generated base64PDF in DMS
            let sFileName = serviceRequestNo + "_" + testName + "_" + orderLineNo;
            let aFile = [{
                attachmentGuId: null,
                attachmentName: sFileName + ReturnConstants().TestCertificate.cExtension,
                orgFileName: sFileName,
                orgFileExtension: ReturnConstants().TestCertificate.cFileExtension,
                docType: null,
                docId: null,
                docGuid: null,
                base64File: base64PDF,
            }];

            try {

                let aUploadFileResponse = await uploadAttachmentInDMSFunc({ Files: aFile });

                if (aUploadFileResponse != null || aUploadFileResponse != undefined) {
                    if (aUploadFileResponse[0].attachmentGuId) {
                        await cds.run(UPDATE(VehicleOrderInspectionLines).set({ attachmentGuId_attachmentGuId: aUploadFileResponse[0].attachmentGuId }).where({ vehicleOrderInspectionLines: vehicleOrderInspectionLines }));
                    }
                    return {
                        attachmentGuId: aUploadFileResponse[0].attachmentGuId || null,
                        base64PDF: aUploadFileResponse[0].base64File || base64PDF
                    }
                };

            } catch (error) {
                throw error.message
            }
            return {
                attachmentGuId: null,
                base64PDF: base64PDF
            };
        } catch (error) {
            req.error('ERRORMESSAGEPREVIEW', error.message);
        }

    });

    /***********************************************************
    *  function for Print tax invoice 
    ***********************************************************/
    async function taxInvoicePrint(serviceRequestNo, plateNo, testName) {

        try {

            const oQuery = SELECT
                .from(VehicleOrderInspections)
                .where({ serviceRequestNo: serviceRequestNo })
                .columns(vehOrder => {
                    vehOrder('*')
                    vehOrder.VehOrdInspDetails(vehOrdDetail => {
                        vehOrdDetail('*')
                        vehOrdDetail.vehOrdInspLines(vehOrdLine=> {
                            vehOrdLine('*')
                            vehOrdLine.vehicleOrderCoupans('*')
                        });
                    });
                });

            async function fetchPlantDetail(plantCode) {
                let aPlantDetails = await SELECT.from(PlantMasters).where({ plantCode: plantCode });
                return aPlantDetails[0];
            }

            //  **Execute Query**
            const aResult = await cds.tx(async tx => await tx.run(oQuery));
            let aResponse;

            if (aResult != null) {
                aResponse = aResult[0]
                aResponse.plantDetails = await fetchPlantDetail(aResponse?.plantCode);
                
            // adding coupoun code in header
            let oFirstCoupon = aResponse?.VehOrdInspDetails
                ?.flatMap(vehOrdDetails => vehOrdDetails.vehOrdInspLines || [])
                ?.flatMap(vehOrdLine => vehOrdLine.vehicleOrderCoupans || [])
                ?.find(vehOrdCoupan => vehOrdCoupan?.couponNumber);

            let sCouponNumber = oFirstCoupon?.couponNumber || null;

            // add coupoun code in response
            if(sCouponNumber != null ){
                aResponse.couponNumber = sCouponNumber;
                aResponse.discountValue = oFirstCoupon.condValue;
            }
                aResponse.invoiceItems = await generateInvoiceItems(aResponse);
                aResponse.vatDetails = await generateInvoiveFlatVatSummary(aResponse);
            }

           
            const oPaymentQuery = SELECT
                .from(PaymentDocs)
                .where({ orderNumber: serviceRequestNo })
                .columns(payDocs => {
                    payDocs('*')
                    payDocs.items('*')

                });
            const aPaymentResult = await cds.tx(async tx => await tx.run(oPaymentQuery));
            // Validate both arrays have elements before accessing indices
            if (aPaymentResult && aPaymentResult.length > 0 && aResponse && aResponse && Object.keys(aResponse).length > 0) {
                aResponse.paymentDetails = aPaymentResult[0]
                const aLoyaltyItem = aPaymentResult[0].items.find(item => item?.mopCode === ReturnConstants().cLoyalty.cMopCode);
                const sMessage = aLoyaltyItem?.clmMessage;

             if (!sMessage) {
                aResponse.loyaltyDetails = null;
                }
                else {
                    const oResult = {
                        pointsEarned: 0,
                        pointsRedeemed: 0,
                        currentBalance: 0
                    };

                    const sEarnedMatch = aLoyaltyItem.clmMessage.match(/Points earned:\s*(\d+)/i);
                    const sRedeemedMatch = aLoyaltyItem.clmMessage.match(/Points redeemed:\s*(\d+)/i);
                    const sBalanceMatch = aLoyaltyItem.clmMessage.match(/Current balance:\s*(\d+)/i);

                    if (sEarnedMatch) oResult.pointsEarned = Number(sEarnedMatch[1]);
                    if (sRedeemedMatch) oResult.pointsRedeemed = Number(sRedeemedMatch[1]);
                    if (sBalanceMatch) oResult.currentBalance = Number(sBalanceMatch[1]);

                    aResponse.loyaltyDetails = oResult; 
                }
            }
           
            aResponse.logos = null;
            let xmlData = await convertOdataToXml(aResponse, testName);
            // Add logo in xml
            const sPlantRegionCode = aResponse.
                plantRegionCode;

            let oDefaultJsonData = {
                "ADNOC_LOGO": {
                    "logoType": "ADNOC LOGO",
                    "type": "COMMON",
                    "emiratesCode": ""
                },
                "POLICE_LOGO": {
                    "logoType": "POLICE LOGO",
                    "type": "EMIRATE WISE",
                    "emiratesCode": sPlantRegionCode
                }
            };

            xmlData = await updateLogosInXml(xmlData, oDefaultJsonData);

            // template name (uploaded on Adobe Form Service)
            const aReportTemplate = await SELECT.from(MapReportTmpltName).where({
                applicableTestName: testName
            });
            if (!aReportTemplate || aReportTemplate.length === 0) {
                throw new Error('ERRORMESSAGENOREPORTTEMPLATE' + testName);
            }

            const sTemplateName = aReportTemplate[0]?.xdpName;

            if (!sTemplateName) {
                throw new Error('TEMPLATEERRORMESSAGE' + testName);
            }

            const base64PDF = await pdfGenerate(xmlData, sTemplateName)
            return base64PDF;

        } catch (error) {
            throw ('MESSAGENODATAFOUND' + error.message);
        }
    };


    /***********************************************************
    *  Function to merge PDF ( Tax Invoice + Certificate)
    ***********************************************************/
    async function mergePDFsBase64(base64Array) {

        try {
            const oMergedPdfDocument = await PDFDocument.create();

            for (const sBase64String of base64Array) {
                // Decode Base64 to Uint8Array
                const aPdfByteArray = Buffer.from(sBase64String, ReturnConstants().cMergePDFsBase64.cBase64);

                // Load the PDF
                const oLoadedPdfDocument = await PDFDocument.load(aPdfByteArray);

                // Copy all pages
                const aCopiedPages = await oMergedPdfDocument.copyPages(
                    oLoadedPdfDocument,
                    oLoadedPdfDocument.getPageIndices()
                );

                aCopiedPages.forEach(oPage => oMergedPdfDocument.addPage(oPage));
            }

            const aMergedPdfBytes = await oMergedPdfDocument.save();

            // Convert merged PDF back to Base64
            const sMergedBase64 = Buffer.from(aMergedPdfBytes).toString(ReturnConstants().cMergePDFsBase64.cBase64);

            return sMergedBase64;

        } catch (oError) {
            console.error('ERRORMESSAGEWHILEMERGINGPDF', oError.message);
            throw oError;
        }
    }


    /***********************************************************
    *  Function to get Invoice Items for tax invoice print
    ***********************************************************/
    async function generateInvoiceItems(json) {

        const aInvoiceItems = [];
        const sCouponNumber = json?.couponNumber;
        json.VehOrdInspDetails.forEach(oInspectionDetail => {
            oInspectionDetail.vehOrdInspLines.forEach(oInspectionLine => {
                const fActualLineTotal = parseFloat(oInspectionLine.lineTotal);
                const fUnitPrice = parseFloat(oInspectionLine.unitPrice);
                let plateNumber = oInspectionDetail.plateNumber ? `${oInspectionDetail.plateNumber}/` : '';
                let sPromoText;

               if(sCouponNumber != undefined)  
               {
                    sPromoText = ReturnConstants().cLoyalty.cLoyaltyDiscount ;
               }else{
                    sPromoText = ReturnConstants().cLoyalty.cPromotionalDiscount;
               }
                // Push actual item
                aInvoiceItems.push({
                    items:
                        oInspectionLine.materialName +
                        "\n" + oInspectionLine.materialNameArabic + (oInspectionLine.discountAmount != 0.0 ? sPromoText : ""),
                    quantity: Number(oInspectionLine.quantity),
                    unitPrice: oInspectionLine.unitPrice,
                    lineTotal: oInspectionLine.lineTotal
                        + "\n" + (oInspectionLine.discountAmount != 0.0 ? "\n" + oInspectionLine.discountAmount : ""),
                    vatCode: oInspectionLine.vatPercent
                });

            });
        });

        return aInvoiceItems;
    }

    /***********************************************************
    *  Function to get VAT data for tax invoice print
    ***********************************************************/
    async function generateInvoiveFlatVatSummary(json) {
        const oVatSummaryMap = {};

        json.VehOrdInspDetails.forEach(oInspectionDetail => {
            oInspectionDetail.vehOrdInspLines.forEach(oInspectionLine => {
                const sVatCode = oInspectionLine.vatCode || "";
                const fTotalWithoutVAT = parseFloat(oInspectionLine.totalWithOutVAT || "0");
                const fTotalWithVAT = parseFloat(oInspectionLine.totalWithVAT || "0");
                const fVatAmount = parseFloat(oInspectionLine.vat || "0");
                const sVatPercent = parseFloat(oInspectionLine.vatPercent || "0");


                if (!oVatSummaryMap[sVatCode]) {
                    oVatSummaryMap[sVatCode] = {
                        totalVAT: 0,
                        totalWithVAT: 0,
                        vatPercent: sVatPercent,
                        vatCode: sVatCode
                    };
                }

                oVatSummaryMap[sVatCode].totalVAT += fVatAmount;
                oVatSummaryMap[sVatCode].totalWithVAT += fTotalWithVAT;
            });
        });

        // Convert to array and fix number format
        return Object.values(oVatSummaryMap).map(oVatSummary => ({
            totalVAT: oVatSummary.totalVAT.toFixed(2),
            totalWithVAT: oVatSummary.totalWithVAT.toFixed(2),
            vatPercent: oVatSummary.vatPercent,
            vatCode: oVatSummary.vatCode
        }));
    }


    /*******************************************
     Generating base64 value of PDF 
     ******************************************/
    async function generateBase64Pdf(serviceRequestNo, plateNo, chasisNumber, testName, orderLineNo) {
        try {
            const oDataJSON = await getDataWithExpand(serviceRequestNo, plateNo, chasisNumber, testName, orderLineNo);
            let oDataResponse = oDataJSON?.VehOrdInspDetails[0]?.vehOrdInspLines[0];
            let sMatCodeData = oDataResponse?.materialCode;
            let sPlantCodeData = oDataResponse?.plantCode;
            let sOverallTestStatus = oDataResponse?.overallTestStatus;

            let aStatusFilter = ["Both"];

            if (sOverallTestStatus) {

                const sStatus = sOverallTestStatus.toLowerCase();

                if (sStatus === "pass" || sStatus === "passed") {
                    aStatusFilter.push("Pass", "Passed");
                }
                else if (sStatus === "fail" || sStatus === "failed") {
                    aStatusFilter.push("Fail", "Failed");
                }
            }

            // adding terms and condition 
            let oTermCondData = await SELECT
                .from(TermsConditionMasters)
                .where({
                    materialCode: sMatCodeData.toString(),
                    plantCode: sPlantCodeData,
                    serviceStatusText: { in: aStatusFilter }
                });
            if (oTermCondData.length > 0 && oDataResponse) {
                oDataResponse.termsCondition = oTermCondData;
            }

            // adding service request in Traffic Test
            if (testName == ReturnConstants().cGenerateBase64.cTrafficTest) {
                let oSerReqData = await SELECT.from(ServiceRequirementMasters).where({
                    materialCode: sMatCodeData.toString(),
                    plantCode: sPlantCodeData,
                    serviceStatusText: { in: aStatusFilter }
                })
                if (oSerReqData.length > 0 && oDataResponse) {
                    oDataResponse.ServiceRequirement = oSerReqData;
                }
            }

            // adding Correctional Procedure for ESMA Test
            if (testName == ReturnConstants().cGenerateBase64.cEsmaTest) {
                let oCorrProcedureData = await SELECT.from(CorrectionalProcedureMasters).where({
                    materialCode: sMatCodeData.toString(),
                    plantCode: sPlantCodeData,
                    serviceStatusText: { in: aStatusFilter }
                })
                if (oCorrProcedureData.length > 0 && oDataResponse) {
                    oDataResponse.correctionProcedure = oCorrProcedureData;
                }
            }

            //adding Correctional Procedure for VI_MODIFIED_TEST Test
            let xmlData;
            if (testName === ReturnConstants().cGetTestResultModifiedById.cVIMODIFIEDTEST) {
                let oTestResult = JSON.parse(JSON.stringify(oDataJSON));

                let oTestChars = oTestResult.VehOrdInspDetails[0].vehOrdInspLines[0].vehOrdInspLinesTestChars;
                const oModifiedTest = oTestChars
                    .map(hdr => {
                        return {
                            ...hdr,
                            testResModHdr: hdr.testResModHdr.map(modHdr => {
                                return {
                                    ...modHdr,
                                    testResModDtl: modHdr.testResModDtl.filter(
                                        dtl => dtl.controlTypeValueLabel1Flag === true || dtl.controlTypeValueLabel2Flag === true
                                    )
                                };
                            })
                        };
                    });


                oTestResult.VehOrdInspDetails[0].vehOrdInspLines[0].vehOrdInspLinesTestChars = oModifiedTest;

                oModifiedTest.forEach(item => {
                    item.testResModFailedHdr = JSON.parse(JSON.stringify(item.testResModHdr));

                    if (item.testResModFailedHdr && Array.isArray(item.testResModFailedHdr)) {
                        item.testResModFailedHdr.forEach(hdr => {
                            if (hdr.testResModDtl && Array.isArray(hdr.testResModDtl)) {
                                hdr.testResModDtl = hdr.testResModDtl.filter(dtl => dtl.controlTypeValueLabel2Flag === true);
                            }
                        });
                    }
                });

                oTestResult.VehOrdInspDetails[0].vehOrdInspLines[0].vehOrdInspLinesTestChars = oModifiedTest;

                xmlData = await convertOdataToXml(oTestResult, testName);
            } else {
                xmlData = await convertOdataToXml(oDataJSON, testName);
            }

            // add dynamic logo in XML
            //return xmlData; Pls do not delete 
            const sPlantRegionCode = oDataJSON?.plantRegionCode;
            const logoIndex = oDataJSON.CalculatedFields?.logoIndex;
            const sCarbonFootprintLogoTypeValue = oDataJSON.CalculatedFields?.carbonFootPrint;
            const materialCodes = oDataJSON.VehOrdInspDetails.flatMap(detail =>
                detail.vehOrdInspLines.map(line => line?.materialCode)
            );
            let firstChar = orderLineNo.toString().charAt(0); 
            let materialCodeIndex = parseInt(firstChar) - 1;

            // logic for CarbonFootPrint Logo
            let sCarbonFootprintLogoType = '';
            if (sCarbonFootprintLogoTypeValue == null || sCarbonFootprintLogoTypeValue == ReturnConstants().cGenerateBase64.cCarbonFootPrintLogoNotApplicable || sCarbonFootprintLogoTypeValue == '') {
                sCarbonFootprintLogoType = ReturnConstants().carbonFootPrintReport.CARBONFOOTPRINT5;
            }
            else if (parseInt(sCarbonFootprintLogoTypeValue) >= 0 && parseInt(sCarbonFootprintLogoTypeValue) <= 0.625) {
                sCarbonFootprintLogoType = ReturnConstants().carbonFootPrintReport.CARBONFOOTPRINT1;
            }
            else if (parseInt(sCarbonFootprintLogoTypeValue) > 0.625 && parseInt(sCarbonFootprintLogoTypeValue) <= 1.25) {
                sCarbonFootprintLogoType = ReturnConstants().carbonFootPrintReport.CARBONFOOTPRINT2;
            }
            else if (parseInt(sCarbonFootprintLogoTypeValue) > 1.25 && parseInt(sCarbonFootprintLogoTypeValue) <= 2.49) {
                sCarbonFootprintLogoType = ReturnConstants().carbonFootPrintReport.CARBONFOOTPRINT3;
            }
            else if (parseInt(sCarbonFootprintLogoTypeValue) > 2.5) {
                sCarbonFootprintLogoType = ReturnConstants().carbonFootPrintReport.CARBONFOOTPRINT4;
            }
            //All Logo read from the logo master
            let oDefaultJsonData = {
                "ADNOC_LOGO": {
                    "logoType": "ADNOC LOGO",
                    "type": "COMMON",
                    "emiratesCode": ""
                },
                "ESMA_LOGO": {
                    "logoType": "ESMA LOGO",
                    "type": "SERVICE WISE",
                    "emiratesCode": materialCodes[0].toString()
                },
                "POLICE_LOGO": {
                    "logoType": "POLICE LOGO",
                    "type": "EMIRATE WISE",
                    "emiratesCode": sPlantRegionCode
                },
                "CARBON_FOOTPRINT": {
                    "logoType": sCarbonFootprintLogoType,
                    "type": "HEADER CERTIFICATE",
                    "emiratesCode": ""
                },
                "FUEL_LOGO": {
                    "logoType": "FUEL LOGO 2",
                    "type": "HEADER CERTIFICATE",
                    "emiratesCode": ""
                }
            };
            xmlData = await updateLogosInXml(xmlData, oDefaultJsonData);

            // template name (uploaded on Adobe Form Service) 
            const aReportTemplate = await SELECT.from(MapReportTmpltName).where({
                applicableTestName: testName
            });
            if (!aReportTemplate || aReportTemplate.length === 0) {
                throw new Error('REPORTTEMPLATEMESSAGE' + testName);
            }

            const sTemplateName = aReportTemplate[0]?.xdpName;

            if (!sTemplateName) {
                throw new Error('TEMPLATEMESSAGE' + testName);
            }

            const base64PDF = await pdfGenerate(xmlData, sTemplateName)
            return base64PDF;

        } catch (error) {
            throw ('ERRORMESSAGENODATAFOUNDFORBASE64' + error.message);
        }
    }

    /***********************************************************
                *  Method to Get Data With Expand
    ***********************************************************/
    async function getDataWithExpand(serviceRequestNo, plateNo, chasisNumber, testName, orderLineNo) {
        try {

            // generate query to fetch service line  data
            const oQuery = SELECT
                .from(VehicleOrderInspections)
                .where({ serviceRequestNo: serviceRequestNo })
                .columns(vehOrd => {
                    vehOrd('*')
                    vehOrd.VehOrdInspDetails.where({ plateNumber: plateNo })(vehOrdDetail => {
                        vehOrdDetail('*')
                        vehOrdDetail.VehicleDetails('*').where({ plateNumber: plateNo })
                        vehOrdDetail.vehOrdInspLines.where({ orderLineNo: orderLineNo })(vehOrdLine => {
                            vehOrdLine('*');

                            vehOrdLine.vehOrdInspLinesTestChars
                                (vehOrdLineTestChar => {
                                    vehOrdLineTestChar('*');

                                    vehOrdLineTestChar.vehicleOrderInspectionChangeVehicleLogs
                                        .where({ fieldLabelEnglish: ReturnConstants().cGetDataWithExpand.cFieldLabelEnglish })(x => { x('*') });

                                    vehOrdLineTestChar.testResultsESMAS('*');

                                    vehOrdLineTestChar.testResultsTraffics('*');

                                    vehOrdLineTestChar.testResultsPermits('*');

                                    vehOrdLineTestChar.testResComps(comps => {
                                        comps('*');
                                        comps.compResSubTypes('*');
                                    });

                                    vehOrdLineTestChar.testRessVisuals(visual => {
                                        visual('*');
                                        visual.testResVsSDtl('*');
                                    });
                                    vehOrdLineTestChar.testResMahaOutDtls(mahaOutDtl => {
                                        mahaOutDtl('*');
                                        mahaOutDtl.testMahaOutResult('*');
                                    });
                                    vehOrdLineTestChar.testResModHdr(modHdr => {
                                        modHdr('*');
                                        modHdr.testResModDtl(modDtl => {
                                            modDtl('*');
                                            modDtl.TestResModCom('*');
                                            modDtl.modResTypes('*');
                                        })
                                    });
                                });
                        });
                    });
                });


            // 🔹 **Execute Query**
            let oDataResult;
            const aResult = await cds.tx(async tx => await tx.run(oQuery));
            if (aResult != null) {
                oDataResult = aResult[0];
                // if (testName == ReturnConstants().cGetDataWithExpand.cCertificateTest) {
                //     let oCalculatedOdata = await calcFunForVehicleTestCertificate(aResult, plateNo, chasisNumber)
                //     oDataResult = oCalculatedOdata[0];
                // }
                let oCalculatedOdata = await calcFunForVehicleTestCertificate(aResult, plateNo, chasisNumber)
                oDataResult = oCalculatedOdata[0];
            }
            oDataResult.logos = null
            return oDataResult

        } catch (error) {
            throw new Error('ERRORMESSAGEINGETDATWITHEXPAND' + error.message);
        }
    }

    /***********************************************************
        *  Function for the calculation in vehicle test certificate
    ***********************************************************/
    async function calcFunForVehicleTestCertificate(oData, plateNo, chasisNumber) {

        let sDistancePerYear = null;
        let sFuelConsumedPerYear = null;
        let sFuelCostPerYear = null;
        let sCarbonFootPrintPerYear = null;

        // 1:Calculation for Distance per Year 
        let sPastOdometer = oData[0]?.VehOrdInspDetails[0]?.vehOrdInspLines[0]?.vehOrdInspLinesTestChars
            .filter(item => item.applicableTestName == ReturnConstants().cVehicleTestCertificate.cApplicableTestName)[0]
            ?.vehicleOrderInspectionChangeVehicleLogs
            .filter(citem => citem.fieldLabelEnglish == ReturnConstants().cVehicleTestCertificate.cFieldLabelEnglish)[0]
            ?.OldTextEnglish ?? 0;

        // console.log("pastMilage", sPastOdometer)
        let oVehicleDetails = oData[0]?.VehOrdInspDetails[0]?.VehicleDetails
        let sCurrentOdometer = oVehicleDetails?.mileage;
        let sNumberOfCylinders = (oVehicleDetails?.numberOfCylinders).toString();

        sDistancePerYear = sCurrentOdometer - sPastOdometer;  // result 1
        // oData[0].distancePerYear = sDistancePerYear.toString()

        // 2:Calculation of Fuel Cost per year 
        let sFuelUsageRateData = await SELECT.from(FuelUsageRateMasters).where({ cylinders: sNumberOfCylinders })
        let sFuelRates = 1;
        if (sFuelUsageRateData.length > 0) {
            sFuelRates = sFuelUsageRateData[0]?.fuelRates;
            sFuelConsumedPerYear = sDistancePerYear * sFuelRates;//result 2
            sFuelConsumedPerYear = sFuelConsumedPerYear.toFixed(3);
            // oData[0].fuelCostPerYear = sFuelConsumedPerYear.toString()
        }


        // 3: calculation for fuel cost per year
        let sActualWeight = oVehicleDetails?.fullWeight;
        let sBaseWeight = oVehicleDetails?.emptyWeight;

        let sAdjustFuelUsageRate = sFuelRates * (1 + (sActualWeight - sBaseWeight) / sBaseWeight);

        let sFuelConsumption = sDistancePerYear * sAdjustFuelUsageRate;

        let sFuelPriceMaster = await SELECT.from(FuelPriceMasters)
            .orderBy({ fromDate: ReturnConstants().cVehicleTestCertificate.cOrderBy }).limit(1);

        if (sFuelPriceMaster.length > 0) {
            let sFuelPriceAverage = sFuelPriceMaster[0]?.average;

            sFuelCostPerYear = sFuelConsumption * sFuelPriceAverage;
            sFuelCostPerYear = sFuelCostPerYear.toFixed(3);
        }

        let sLastYearCarbonMonoData = await fetchLastYearDataForVehicleTestCert(chasisNumber, plateNo);
        // console.log("sLastYearCarbonMonoDatainFunction", sLastYearCarbonMonoData)

        // 4: Carbon Footprintper year 
        sCarbonFootPrintPerYear = oData[0]?.VehOrdInspDetails[0]?.vehOrdInspLines[0]?.vehOrdInspLinesTestChars
            .filter(item => item.applicableTestName == ReturnConstants().cVehicleTestCertificate.cES_OUTTestName)[0]
            ?.testResMahaOutDtls[0]?.testMahaOutResult
            .filter(citem => citem.mahaCodeKey == ReturnConstants().cVehicleTestCertificate.cMahaCodeKey)[0]
            ?.mahaCodeValue ?? null;

        oData[0].CalculatedFields = {
            "distancePerYear": sDistancePerYear?.toString() || null,
            "fuelConsumedPerYear": sFuelConsumedPerYear?.toString() || null,
            "fuelCostPerYear": sFuelCostPerYear?.toString() || null,
            "lastYearCarbon": sLastYearCarbonMonoData?.toString() || null,
            "carbonFootPrint": sCarbonFootPrintPerYear?.toString() || null
        }
        return oData;

    }

    /***********************************************************
        generic function to fetch data from table 
    ************************************************************/
    async function getDataFromTable({ tableName, conditions = null, columns = null, orderBy = null }) {
        try {
            const database = await cds.connect.to(ReturnConstants().cGetDataFromTable.cDatabase);
            const entity = database.entities[tableName];

            if (!entity) {
                throw new Error(tableName + 'TABLENOTFOUND');
            }

            let query = SELECT.from(entity);

            if (columns) {
                query = query.columns(columns);
            }

            if (conditions) {
                if (Array.isArray(conditions)) {
                    for (const condition of conditions) {
                        if (condition.length === 3) {
                            const [columnName, operator, value] = condition;
                            query = query.where({ [columnName]: { [operator]: value } });
                        } else {
                            throw new Error('CONDITIONARRAYERRORMESSAGE' + JSON.stringify(condition));
                        }
                    }
                } else {
                    throw new Error('CONDITIONFORMATERRORMESSAGE');
                }
            }

            if (orderBy) {
                // Support single string or array of fields
                if (Array.isArray(orderBy)) {
                    query = query.orderBy(...orderBy);
                } else {
                    query = query.orderBy(orderBy);
                }
            }

            const allData = await cds.tx(async tx => {
                return await tx.run(query);
            });

            return allData;

        } catch (error) {
            throw new Error('CONDITIONARRAYERRORMESSAGE' + error.message);
        }
    }

    /***********************************************************
        function to fetch last year data for VEHICLE TEST CERTIFICATE
    ************************************************************/
    async function fetchLastYearDataForVehicleTestCert(sChasisNumber, plateNo) {
        let sLastYearCarbonMonoData;

        try {
            const aGetPrevServiceNum = await getDataFromTable({
                tableName: ReturnConstants().cFetchLastYearDataForVehicleTestCert.cTableName,
                conditions: [
                    [ReturnConstants().cFetchLastYearDataForVehicleTestCert.cChasisNumberConditions, "=", sChasisNumber]
                ],
                columns: [ReturnConstants().cFetchLastYearDataForVehicleTestCert.cServiceRequestNo],
                orderBy: ReturnConstants().cFetchLastYearDataForVehicleTestCert.cOrderBy
            });
            //   console.log("Previous Service Numbers:", aGetPrevServiceNum);
            if (aGetPrevServiceNum.length > 1) {
                for (const item of aGetPrevServiceNum.slice(1)) {

                    const aGetLastYearCarbonMonoData = await getDataFromTable({
                        tableName: ReturnConstants().cFetchLastYearDataForVehicleTestCert.cTableName,
                        conditions: [
                            [ReturnConstants().cFetchLastYearDataForVehicleTestCert.cServiceRequestNo, "=", item.serviceRequestNo],
                            [ReturnConstants().cFetchLastYearDataForVehicleTestCert.cPlateNumber, "=", plateNo],
                            [ReturnConstants().cFetchLastYearDataForVehicleTestCert.cMahaCodeKey, "=", ReturnConstants().cFetchLastYearDataForVehicleTestCert.cMahaCodeValue]
                        ],
                        columns: [
                            ReturnConstants().cFetchLastYearDataForVehicleTestCert.cMaxMahaCodeValue
                        ]
                    });



                    if (aGetLastYearCarbonMonoData.length > 0) {
                        sLastYearCarbonMonoData = aGetLastYearCarbonMonoData[0].mahaCodeValue;

                        if (sLastYearCarbonMonoData != null) {
                            return sLastYearCarbonMonoData;
                        }
                    }
                }
            }

            return sLastYearCarbonMonoData;

        } catch (error) {
            throw new Error('ERRORMESSAGEFETCHLASTYEARCARBONMONODATA' + error.message);
        }
    }

    /***********************************************************
        *  Convert odata To Xml
    ***********************************************************/
    async function convertOdataToXml(odata, testName) {

        try {

            let oInputjson = odata
            let sFilterColumnName = "";
            let sFilterColumnNameForModify = "";

            if (testName === ReturnConstants().cConvertOdataToXml.cComprehensiveTest || testName === ReturnConstants().cConvertOdataToXml.cTrafficTest) {
                sFilterColumnName = ReturnConstants().cConvertOdataToXml.cTestMainTypeNo;
            }
            if (testName === ReturnConstants().cConvertOdataToXml.cModifiedTest) {

                sFilterColumnNameForModify = ReturnConstants().cConvertOdataToXml.cTestMainTypeNo;
            }
            let oOutput1 = oInputjson;
            if (sFilterColumnNameForModify.length > 0) {

                let oOutput = groupByColumnInParent(oInputjson, sFilterColumnNameForModify);
                let filterData;
                oOutput.VehOrdInspDetails[0]?.vehOrdInspLines[0]?.vehOrdInspLinesTestChars
                    .filter(function (item) {
                        return item && item.applicableTestName === ReturnConstants().cConvertOdataToXml.cVisualTest;
                    })
                    .map(function (item) {
                        if (item.testRessVisuals &&
                            Array.isArray(item.testRessVisuals) &&
                            item.testRessVisuals[0]) {
                            filterData = groupByColumnInParent(item.testRessVisuals, ReturnConstants().cConvertOdataToXml.cTestSubTypeNo)
                            item.testRessVisuals[0] = filterData[0]
                        }
                        return item;
                    })
                // oOutput1.VehOrdInspDetails[0].vehOrdInspLines[0].vehOrdInspLinesTestChars.map(item => { item.VI_VISUAL_TEST})
                oOutput.VehOrdInspDetails[0]?.vehOrdInspLines[0]?.vehOrdInspLinesTestChars
                    .filter(function (item) {
                        return item && item.applicableTestName === ReturnConstants().cConvertOdataToXml.cVisualTest;
                    })
                    .map(function (item) {
                        if (item.testRessVisuals &&
                            Array.isArray(item.testRessVisuals) &&
                            item.testRessVisuals[0]) {

                            item.testRessVisuals = renameKeysPreserve(item.testRessVisuals[0])
                        }
                        return item;
                    })
                oOutput1 = oOutput
            }
            let oMidOutput = oOutput1
            if (sFilterColumnName.length > 0) {

                oMidOutput = groupByColumnInParent(oOutput1, sFilterColumnName);
            }


            const oOutput2 = groupByColumnInParent(oMidOutput, ReturnConstants().cConvertOdataToXml.cApplicableTestName);
            const oOutput3 = groupByColumnInParent(oOutput2, ReturnConstants().cConvertOdataToXml.cMahaCodeKey);
            const oOutputFinal = groupByColumnInParent(oOutput3, ReturnConstants().cConvertOdataToXml.cMopCode);

            const xmlData = convertJsonToXml(oOutputFinal)
            return xmlData;

        } catch (error) {
            throw ('ERRORMESSAGECREATINGFORM' + error.message)
        }
    }

    /***********************************************************
        *  Method to Group By Column In Parent
    ***********************************************************/
    function groupByColumnInParent(data, groupByColumn) {

        const traverseAndGroup = (obj) => {
            if (Array.isArray(obj)) {

                return obj.map(item => traverseAndGroup(item));

            } else if (typeof obj === ReturnConstants().cGroupByColumnInParent.cObject && obj !== null) {

                let transformedObj = { ...obj };

                // If the key is found inside an array, group by its value
                Object.keys(transformedObj).forEach(key => {
                    if (Array.isArray(transformedObj[key])) {
                        let itemsArray = transformedObj[key];

                        // Check if we should group this array
                        if (itemsArray.length > 0 && itemsArray[0].hasOwnProperty(groupByColumn)) {

                            let groupedData = {};

                            itemsArray.forEach(item => {
                                let keyValue = item[groupByColumn]; // Get value of the grouping column
                                keyValue = String(keyValue).replace(/ /g, '_');
                                keyValue = String(keyValue).replace(/&/g, ReturnConstants().cGroupByColumnInParent.cAnd);
                                if (!isNaN(keyValue)) {
                                    keyValue = '_' + keyValue;
                                }
                                if (!groupedData[keyValue]) {
                                    groupedData[keyValue] = [];
                                }
                                groupedData[keyValue].push(traverseAndGroup(item)); // Recursive processing
                            });

                            // Replace the original array with the grouped object
                            transformedObj[key] = [groupedData];

                        } else {

                            // Process elements inside the array
                            transformedObj[key] = itemsArray.map(item => traverseAndGroup(item));
                        }
                    } else if (typeof transformedObj[key] === ReturnConstants().cGroupByColumnInParent.cObject && transformedObj[key] !== null) {

                        transformedObj[key] = traverseAndGroup(transformedObj[key]); // Recursively process nested objects
                    }
                });

                return transformedObj;
            }
            return obj;
        };

        return traverseAndGroup({ ...data });
    }

    /***********************************************************
        *  RenameKeyOfTheArray
    ***********************************************************/
    function renameKeysPreserve(input) {
        // var visuals = input|| [];
        var result = [];

        // for (var i = 0; i < visuals.length; i++) {
        var originalMainObj = input;     // e.g. { "_014": [ ... ], "_013": [ ... ] }
        var converted = {};                   // we'll push { MainType: [ ... ] }
        converted.MainTypes = [];

        // iterate every original main key (_014, _013, ...)
        for (var mainKey in originalMainObj) {
            if (!Object.prototype.hasOwnProperty.call(originalMainObj, mainKey)) continue;

            var mainArray = originalMainObj[mainKey]; // usually an array of 1 object
            if (!Array.isArray(mainArray)) continue;

            // there may be multiple items in mainArray — preserve them all
            for (var m = 0; m < mainArray.length; m++) {
                var mainItem = mainArray[m]; // object that contains subtype keys

                // create an entry for this MainType
                var mainEntry = {
                    // MainTypeNo: mainKey.replace(/^_+/, ''), // "014" (keeps the number for clarity)
                    MainType: []                             // will hold each subtype as an object
                };

                // iterate subkeys (EXHAUST_SOUND_NOISY, etc.)
                for (var subKey in mainItem) {
                    if (!Object.prototype.hasOwnProperty.call(mainItem, subKey)) continue;

                    var subValue = mainItem[subKey]; // array of results for that subtype

                    // push each SubType as an object so we avoid duplicate keys
                    mainEntry.MainType.push({
                        // SubTypeName: subKey,   // original name preserved
                        SubType: subValue      // original array preserved
                    });
                }

                // push this mainEntry into the MainType array
                converted.MainTypes.push(mainEntry);
            }
        }

        result.push(converted);
        // }

        return result[0].MainTypes;
    }


    /***********************************************************
        *  Convert Json To Xml
    ***********************************************************/
    function convertJsonToXml(json, root = true) {

        // Helper function to escape XML special characters
        const escapeXml = (str) => {
            if (typeof str !== ReturnConstants().cConvertJsonToXml.cString) return str;
            return str.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;")
                .replace(/\n/g, "&#xA;");
        };

        let xml = root ? '<root>' : '';

        for (const key in json) {
            if (json.hasOwnProperty(key)) {
                const value = json[key];

                if (typeof value === ReturnConstants().cConvertJsonToXml.cObject && value !== null) {
                    if (Array.isArray(value)) {
                        // Handle arrays correctly
                        xml += `<${key}>`;
                        value.forEach(item => {
                            xml += `<Item>${convertJsonToXml(item, false)}</Item>`; // Use <Item> to wrap each array element
                        });
                        xml += `</${key}>`;
                    } else {
                        // Nested objects
                        xml += `<${key}>${convertJsonToXml(value, false)}</${key}>`;
                    }
                } else {
                    // Handle primitive values (numbers, strings, booleans)
                    let escapedValue = value === null ? 'null' : escapeXml(value.toString());
                    xml += value === '' ? `<${key} />` : `<${key}>${escapedValue}</${key}>`;
                }
            }
        }

        return root ? xml + '</root>' : xml;
    }

    /***********************************************************
        *  Method to  Generate PDF
    ***********************************************************/
    async function pdfGenerate(xmlData, templateName) {
        try {

            // calling adobe des to get xdptemplate
            const formDestination = await cds.connect.to(ReturnConstants().cPdfGenerate.cAdobeReports);
            // const formTemplateResponse = await formDestination.get(`/v1/forms/VehicleInspection/templates/${templateName}`);
            const formTemplateResponse = await formDestination.get(`/v1/forms/${templateName}/templates/${templateName}`);
            // console.log("formTemplateResponse", formTemplateResponse)
            const xdpBase64 = formTemplateResponse.xdpTemplate;
            const xmlBase64 = Buffer.from(xmlData, ReturnConstants().cPdfGenerate.cUtf8).toString(ReturnConstants().cPdfGenerate.cBase64);
            const payload = {
                xdpTemplate: xdpBase64,
                xmlData: xmlBase64,//dummyalf1data,
                formType: ReturnConstants().cPdfGenerate.cPrint,
                formLocale: ReturnConstants().cPdfGenerate.cFormLocale
            };

            // generate pdf from the Report Template using Report Data
            const connectionPost = await cds.connect.to(ReturnConstants().cPdfGenerate.cAdobeReports);
            const renderResponse = await connectionPost.post(ReturnConstants().cPdfGenerate.cURL, payload);
            // console.log("renderResponse",renderResponse);

            return renderResponse.fileContent;

        } catch (error) {
            throw (500, 'FAILEDTOGENERATEPDF', error.message);
        }
    }

    /***********************************************************
     *  Method to Get Visual Data
    ***********************************************************/
    service.on('fetchVisualData', async (oReq) => {
        try {
            // Step 1: Get distinct parent-level Visual test data
            const aTestDataDistinct = await SELECT.distinct.from(TestTypeMasters)
                .columns(
                    "testText",
                    "testTextNo",
                    "testMainTypeNo",
                    "testMainTypeTextEnglish",
                    "testMainTypeTextArabic",
                    "controlTypeValueLabel1",
                    "controlTypeValueLabel2",
                    "controlTypeValueLabel3",
                    "controlTypeValueLabel4",
                    "examinationMethodEnglish",
                    "examinationMethodArabic"
                )
                .where({
                    testText: ReturnConstants().cVisual.cTestText,
                    testTextNo: ReturnConstants().cVisual.cTestTextNo
                });

            if (!aTestDataDistinct.length) {
                return oReq.error(ReturnConstants().ErrorCode.NotFound, 'MESSAGENODATAFOUNDFORCOMPREHENSIVETEST');
            }

            // Step 2: Full visual dataset for grouping
            const aTestDataFull = await SELECT.from(TestTypeMasters).where({ testText: ReturnConstants().cVisual.cTestText });

            // Step 3: Combinations for child entries
            const aTestCombinationData = await SELECT.from(TestTypeCombinationMaster);

            const aResponseArray = [];

            aTestDataDistinct.forEach(oParent => {
                const sTestMainType = oParent.testMainTypeTextEnglish;
                const aGroupedData = {};

                // Step 4: Grouping and deduplication of test subtype rows
                const aTestSubTypes = [...new Set(
                    aTestDataFull
                        .filter(oRow => oRow.testMainTypeTextEnglish === sTestMainType)
                        .map(oRow => JSON.stringify({
                            id: uuid(),
                            testSubTypeNo: oRow.testSubTypeNo,
                            testSubTypeTextEnglish: oRow.testSubTypeTextEnglish,
                            testSubTypeTextArabic: oRow.testSubTypeTextArabic,
                            controlType1: oRow.controlType1,
                            controlType2: oRow.controlType2,
                            controlType3: oRow.controlType3,
                            controlType4: oRow.controlType4,
                            controlType5: oRow.controlType5,
                            controlType6: oRow.controlType6,
                            controlTypeValueLabel1: false,
                            controlTypeValueLabel2: false,
                            controlTypeValueLabel3: oRow.controlTypeValueLabel3,
                            controlTypeValueLabel4: oRow.controlTypeValueLabel4,
                            controlTypeValueLabel5: oRow.controlTypeValueLabel5,
                            controlTypeValueLabel6: oRow.controlTypeValueLabel6,
                            conditionalMappingMasterCode: oRow.conditionalMappingMasterCode,
                            Highlight: ReturnConstants().cVisual.cHighlight
                        }))
                )].map(sRowStr => JSON.parse(sRowStr)); // Parse back to objects

                // Step 5: Assign child subcategories from combination data
                aTestSubTypes.forEach(oTestSub => {
                    oTestSub.ChildSubCategory = aTestCombinationData
                        .filter(oComb => oComb.testTypeKey === oTestSub.conditionalMappingMasterCode)
                        .map(oComb => ({
                            testTypeMaster: oComb.testTypeMaster_testTypeUUID,
                            testTypeCombinationUUID: oComb.testTypeCombinationUUID,
                            testTypeNo: oComb.testTypeNo,
                            testTypeTextEnglish: oComb.testTypeTextEnglish,
                            testTypeTextArabic: oComb.testTypeTextArabic,
                            remarks: null,
                            Highlight: ReturnConstants().cVisual.cHighlight,
                            issueType: ReturnConstants().cVisual.cIssueType
                        }));
                });

                aGroupedData.SubCategory = aTestSubTypes;

                // Step 6: Build final response object
                const oResponse = {
                    testTextNo: oParent.testTextNo,
                    testText: oParent.testText,
                    testMainTypeNo: oParent.testMainTypeNo,
                    testMainType: sTestMainType,
                    testMainTypeTextArabic: oParent.testMainTypeTextArabic,
                    controlTypeValueLabel1: oParent.controlTypeValueLabel1,
                    controlTypeValueLabel2: oParent.controlTypeValueLabel2,
                    controlTypeValueLabel3: oParent.controlTypeValueLabel3,
                    controlTypeValueLabel4: oParent.controlTypeValueLabel4,
                    examinationMethodEnglish: oParent.examinationMethodEnglish,
                    examinationMethodArabic: oParent.examinationMethodArabic,
                    Highlight: ReturnConstants().cVisual.cHighlight,
                    ...aGroupedData
                };

                aResponseArray.push(oResponse);
            });


            return { aResponseArray };

        } catch (oError) {
            throw oReq.error(ReturnConstants().ErrorCode.InternalServer, 'ERRORMESSAGEFETCHINGVISUALDATA' + oError.message);
        }
    });

    /***********************************************************
    * function to Upload Attachment in DMS
    ***********************************************************/
    async function uploadAttachmentInDMSFunc(aFiles) {
        try {
            // Validate input
            if (!aFiles || !Array.isArray(aFiles.Files) || aFiles.Files.length === 0) {
                throw new cds.error('NOFILESPROVIDEDFORUPLOAD', { status: 400 });
            }

            const sRepoNameByEnv = ReturnConstants().cUploadAttachmentInDMSFunc.cADNOCVI;
            const sFolderNameByEnv = ReturnConstants().cUploadAttachmentInDMSFunc.cVehicleInspection;
            const oDMSBase = await cds.connect.to(ReturnConstants().cUploadAttachmentInDMSFunc.cDMS);

            let oRepoData = {
                repoId: null,
                repoName: null,
                folderName: null,
                folderId: null
            };

            // Fetch existing DMS configuration
            let oDMSConfigData = await SELECT.one.from(DMSConfig).where({ repoName: sRepoNameByEnv, folderName: sFolderNameByEnv });

            // If config not found, create repo and folder
            if (!oDMSConfigData) {
                const bCreated = await createRepoAndFolder(oDMSBase, sRepoNameByEnv, sFolderNameByEnv);
                if (bCreated) {
                    oDMSConfigData = await SELECT.one.from(DMSConfig).where({ repoName: sRepoNameByEnv, folderName: sFolderNameByEnv });
                }
                if (!oDMSConfigData) {
                    // Read from service i18 file
                    throw new cds.error('ERRORMESSAGEFORDMSCONFIGURATION', { status: 500 });
                }
            }

            // Populate RepoData
            oRepoData.folderId = oDMSConfigData.folderId;
            oRepoData.folderName = oDMSConfigData.folderName;
            oRepoData.repoName = oDMSConfigData.repoName;
            oRepoData.repoId = oDMSConfigData.repoId;

            try {
                // Verify repository exists in DMS
                const oRepoResponse = await oDMSBase.send(ReturnConstants().cUploadAttachmentInDMSFunc.cGet, ReturnConstants().cUploadAttachmentInDMSFunc.cURL + oRepoData.repoId);

                if (!oRepoResponse) {
                    throw new cds.error('REPOSITORYNOTFOUNDINDMS', { status: 404 });
                }

                try {
                    // Verify folder exists in DMS
                    const oFolderResponse = await oDMSBase.send(ReturnConstants().cUploadAttachmentInDMSFunc.cGet, `/browser/${oRepoData.repoId}/root`);
                    const aFilteredFolders = oFolderResponse.objects.filter(oItem => {
                        return oItem.object.properties["cmis:name"].value.toLowerCase() === sFolderNameByEnv.toLowerCase();
                    });

                    // If folder not found, create it
                    if (aFilteredFolders.length < 1) {
                        const bFolderCreated = await createRepoAndFolder(oDMSBase, sRepoNameByEnv, sFolderNameByEnv);
                        if (!bFolderCreated) {
                            throw new cds.error('FAILEDTOCREATEFOLDERINDMS', { status: 500 });
                        }
                    }

                    // Upload files to DMS
                    const aUploadedFiles = await uploadFileOnDMS(oDMSBase, oRepoData.repoId, oRepoData.folderName, aFiles);

                    // Insert uploaded file metadata into database
                    const aInsertedRows = await INSERT.into(DAttachment).entries(aUploadedFiles);
                    if (aInsertedRows && aInsertedRows.results.changes > 0) {
                        return aUploadedFiles;
                    } else {
                        throw new cds.error('ERRORMESSAGEWHILESAVINGUPLOADEDFILES', { status: 500 });
                    }

                } catch (oFolderError) {
                    console.error('ERRORWHILEVERIFYINGORCREATINGFOLDER', oFolderError.message);
                    throw new cds.error('FOLDERPROCESSINGERROR' + oFolderError.message, { status: 500 });
                }

            } catch (oRepoError) {
                console.error('ERRORWHILEVERIFYINGREPOSITORY', oRepoError.message);
                throw new cds.error('REPOSITORYPROCESSINGERROR' + oRepoError.message, { status: 500 });
            }

        } catch (oError) {
            console.error('ERRORINUPLOADATTACHMENTINDMSFUNC', oError.message);
            throw oError;
        }
    }

    /***********************************************************
    *  Action to Upload Attachment in DMS
    ***********************************************************/
    service.on("uploadAttachment", async (oReq) => {
        try {
            const oRequestData = oReq.data;

            // Validate request data
            if (!oRequestData || !Array.isArray(oRequestData.Files) || oRequestData.Files.length === 0) {
                return oReq.error(ReturnConstants().ErrorCode.NotFound, 'MESSAGENOFILESPROVIDEDFORUPLOAD');
            }

            // Call the upload function
            const aUploadResult = await uploadAttachmentInDMSFunc(oRequestData);

            return aUploadResult;

        } catch (oError) {
            console.error('ERRORMESSAGEINUPLOADATTACHMENT', oError.message);
            oReq.reject(ReturnConstants().ErrorCode.InternalServer, 'FAILED' + oError.message);
        }
    });

    /***********************************************************
    *  Method to Create Repo And Folder
    ***********************************************************/
    async function createRepoAndFolder(oDMSBase, sRepoName, sFolderName) {
        // Prepare payload for updating DMSConfig table
        let oUpdateRepoConfigPayload = {
            repoName: sRepoName,
            repoId: null,
            folderName: null,
            folderId: null
        };

        let sRepoId = null;

        try {
            // Fetch all repositories
            const oAllRepoResponse = await oDMSBase.get(ReturnConstants().cCreateRepoAndFolder.cURL);
            let aMatchedRepos = []
            if (Array.isArray(oAllRepoResponse?.repoAndConnectionInfos)) {

                aMatchedRepos = (oAllRepoResponse?.repoAndConnectionInfos || []).filter(oRepo => oRepo.repository.name === sRepoName);
            } else {
                if (oAllRepoResponse?.repoAndConnectionInfos?.repository?.name == sRepoName) {
                    aMatchedRepos.push(oAllRepoResponse.repoAndConnectionInfos)
                }
            }

            // Exactly one repository found
            if (aMatchedRepos.length === 1) {
                sRepoId = aMatchedRepos[0].repository.id;
                oUpdateRepoConfigPayload.repoId = sRepoId;
            }

            // Multiple repositories found with the same name
            if (aMatchedRepos.length > 1) {
                throw new Error('ERRORMESSAGEPRE' + sRepoName + 'ERRORMESSAGEPOST');
            }

            // Repository not found, create a new one
            if (!sRepoId) {
                try {
                    const oPayload = {
                        repository: {
                            displayName: sRepoName,
                            description: ReturnConstants().cCreateRepoAndFolder.cDescription,
                            repositoryType: ReturnConstants().cCreateRepoAndFolder.cRepositoryType,
                            isVersionEnabled: true,
                            isVirusScanEnabled: true,
                            skipVirusScanForLargeFile: false,
                            hashAlgorithms: ReturnConstants().cCreateRepoAndFolder.cHashAlgorithms
                        }
                    };

                    const oHeaders = {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    };

                    // Create the repository
                    const oCreateRepoResponse = await oDMSBase.send(ReturnConstants().cCreateRepoAndFolder.cPOST, ReturnConstants().cCreateRepoAndFolder.cURL, oPayload, oHeaders);
                    sRepoId = oCreateRepoResponse.id;

                    // Create folder in the newly created repository
                    let oFormData = new FormData();
                    oFormData.append("cmisaction", "createFolder");
                    oFormData.append("propertyId[0]", "cmis:name");
                    oFormData.append("propertyValue[0]", sFolderName);
                    oFormData.append("propertyId[1]", "cmis:objectTypeId");
                    oFormData.append("propertyValue[1]", "cmis:folder");
                    oFormData.append("succinct", 'true');

                    try {
                        const oCreateFolderResponse = await executeHttpRequest(
                            { destinationName: oDMSBase.destination },
                            {
                                method: ReturnConstants().cCreateRepoAndFolder.cPOST,
                                url: `/browser/${sRepoId}/root`,
                                headers: {
                                    ...oFormData.getHeaders(),
                                    "Accept": "application/json"
                                },
                                data: oFormData
                            }
                        );

                        let oFinalRepoConfigPayload = {
                            repoName: oCreateRepoResponse.name,
                            repoId: oCreateRepoResponse.id,
                            folderName: oCreateFolderResponse.data.succinctProperties['cmis:name'],
                            folderId: oCreateFolderResponse.data.succinctProperties['cmis:objectId']
                        };

                        try {
                            const oUpdateRepoConfigResult = await INSERT.into(DMSConfig).entries(oFinalRepoConfigPayload);
                            if (oUpdateRepoConfigResult) {
                                return true;
                            }
                        } catch (oInsertError) {
                            console.error('ERRORWHILEINSERTINGREPOSITORYCONFIGURATION', oInsertError.message);
                            throw new Error('FAILEDTOINSERTREPOSITORYCONFIGURATION');
                        }

                    } catch (oCreateFolderError) {
                        console.error('ERRORMESSAGEWHILECREATINGFOLDERINREPOSITORY', oCreateFolderError.message);
                        throw new Error('FAILEDTOCREATEFOLDERINREPOSITORY');
                    }

                } catch (oCreateRepoError) {
                    console.error('ERRORWHILECREATINGREPOSITORY', oCreateRepoError.message);
                    throw new Error('FAILEDTOCREATEREPOSITORY');
                }

            } else {
                // Repository found, check if folder exists
                try {
                    const oGetFolderResponse = await oDMSBase.send(ReturnConstants().cCreateRepoAndFolder.cGET, `/browser/${sRepoId}/root`);
                    const aFilteredFolders = oGetFolderResponse.objects.filter(oItem => {
                        return oItem.object.properties["cmis:name"].value.toLowerCase() === sFolderName.toLowerCase();
                    });

                    if (aFilteredFolders.length < 1) {
                        // Folder not found, create it
                        let oFormData = new FormData();
                        oFormData.append("cmisaction", "createFolder");
                        oFormData.append("propertyId[0]", "cmis:name");
                        oFormData.append("propertyValue[0]", sFolderName);
                        oFormData.append("propertyId[1]", "cmis:objectTypeId");
                        oFormData.append("propertyValue[1]", "cmis:folder");
                        oFormData.append("succinct", 'true');

                        try {
                            const oCreateFolderResponse = await executeHttpRequest(
                                { destinationName: oDMSBase.destination },
                                {
                                    method: ReturnConstants().cCreateRepoAndFolder.cPOST,
                                    url: `/browser/${sRepoId}/root`,
                                    headers: {
                                        ...oFormData.getHeaders(),
                                        "Accept": "application/json"
                                    },
                                    data: oFormData
                                }
                            );

                            oUpdateRepoConfigPayload.folderId = oCreateFolderResponse.data.succinctProperties['cmis:objectId'];
                            oUpdateRepoConfigPayload.folderName = oCreateFolderResponse.data.succinctProperties['cmis:name'];

                        } catch (oCreateFolderError) {
                            console.error('ERRORMESSAGEWHILECREATINGFOLDERINEXISTINGREPOSITORY', oCreateFolderError.message);
                            throw new Error('FAILEDTOCREATEFOLDERINEXISTINGREPOSITORY');
                        }

                    } else {
                        // Folder already exists
                        oUpdateRepoConfigPayload.folderName = aFilteredFolders[0].object.properties["cmis:name"].value;
                        oUpdateRepoConfigPayload.folderId = aFilteredFolders[0].object.properties["cmis:objectId"].value;
                    }

                    try {
                        const oUpdateRepoConfigResult = await INSERT.into(DMSConfig).entries(oUpdateRepoConfigPayload);
                        if (oUpdateRepoConfigResult) {
                            return true;
                        }
                    } catch (oInsertError) {
                        console.error('ERRORWHILEINSERTINGREPOSITORYCONFIGURATION', oInsertError.message);
                        throw new Error('FAILEDTOINSERTREPOSITORYCONFIGURATION');
                    }

                } catch (oGetFolderError) {
                    console.error('ERRORWHILEFETCHINGFOLDERS', oGetFolderError.message);
                    throw new Error('FAILEDTOFETCHFOLDERS');
                }
            }

        } catch (oGeneralError) {
            console.error('UNEXPECTEDERRORINCREATEREPOANDFOLDER', oGeneralError.message);
            throw new Error('UNEXPECTEDERROROCCURRED');
        }
    }

    /***********************************************************
    *  Method to Upload file On DMS
    ***********************************************************/
    async function uploadFileOnDMS(oDMSBase, sRepoId, sFolderName, oData) {
        const aUploadResults = [];

        // Validate input parameters
        if (!oDMSBase || !sRepoId || !sFolderName || !oData || !Array.isArray(oData.Files) || oData.Files.length === 0) {
            throw new Error('PLEASEENSUREFILESDATAAREPROVIDEDCORRECTLY');
        }

        for (const oFile of oData.Files) {
            try {
                // Validate individual file object
                if (!oFile || !oFile.orgFileName || !oFile.orgFileExtension || !oFile.base64File) {
                    console.error('INVALIDFILEDATA', oFile);
                    throw new Error('FILEDATAISMISSINGREQUIREDPROPERTIES');
                }

                // Generate a unique ID for the attachment
                oFile.attachmentGuId = uuid();

                // Prepare file name
                const now = new Date();
                let sFileName = `${oFile.attachmentGuId}_${now}`;

                // Prepare form data
                const oFormData = new FormData();
                oFormData.append("cmisaction", "createDocument");
                oFormData.append("propertyId[0]", "cmis:objectTypeId");
                oFormData.append("propertyValue[0]", "cmis:document");
                oFormData.append("propertyId[1]", "cmis:name");
                oFormData.append("propertyValue[1]", sFileName);
                oFormData.append("succinct", "true");
                oFormData.append("filename", sFileName);
                oFormData.append("includeAllowableActions", "true");

                // Define supported MIME types
                const oMimeTypes = ReturnConstants().cMimeTypes;

                const sExtension = (oFile.orgFileExtension || "").toLowerCase();
                const sContentType = oMimeTypes[sExtension] || ReturnConstants().cUploadFileOnDMS.cContentType;

                let sBase64File = oFile.base64File;

                // Handle empty or invalid base64 content
                if (!sBase64File || typeof sBase64File !== ReturnConstants().cUploadFileOnDMS.cString || sBase64File.trim() === '') {
                    console.error('BASE64FILECONTENTISEMPTYORINVALIDFORFILE' + sFileName);
                    throw new Error('BASE64FILECONTENTISMISSINGFORFILE' + sFileName);
                }

                // Append file to form data
                oFormData.append(ReturnConstants().cUploadFileOnDMS.cFile, sBase64File, {
                    filename: sFileName,
                    contentType: sContentType
                });

                try {
                    // Upload file to DMS
                    const oUploadResponse = await executeHttpRequest(
                        { destinationName: oDMSBase.destination },
                        {
                            method: ReturnConstants().cUploadFileOnDMS.cPOST,
                            url: `/browser/${sRepoId}/root/${sFolderName}`,
                            headers: {
                                ...oFormData.getHeaders(),
                                "Accept": "application/json"
                            },
                            data: oFormData
                        }
                    );

                    // Validate upload response
                    if (!oUploadResponse || !oUploadResponse.data || !oUploadResponse.data.succinctProperties) {
                        console.error('INVALIDRESPONSEFROMDMSFORFILE' + sFileName, oUploadResponse);
                        throw new Error('UPLOADFAILEDORINVALIDRESPONSERECEIVEDFORFILE' + sFileName);
                    }

                    // Cleanup and attach DMS properties
                    delete oFile.base64File;

                    oFile.dmsFileId = oUploadResponse.data.succinctProperties['cmis:objectId'] || '';
                    oFile.dmsFileName = oUploadResponse.data.succinctProperties["cmis:contentStreamFileName"] || '';
                    oFile.dmsFileExtension = oUploadResponse.data.succinctProperties["cmis:contentStreamMimeType"] || '';
                    oFile.dmsFolderPath = `/browser/${sRepoId}/root/${sFolderName}`;
                    oFile.dmsRepoId = sRepoId;

                    aUploadResults.push(oFile);

                } catch (oUploadError) {
                    console.error('ERRORDURINGFILEUPLOADFOR' + sFileName + ':', oUploadError.message);
                    throw new Error('FILEUPLOADFAILEDFOR' + sFileName);
                }

            } catch (oFileProcessError) {
                console.error('ERROWHILEPROCESSINGFILE', oFileProcessError.message);
                throw new Error('FILEPROCESSINGFAILED');
            }
        }

        return aUploadResults;
    }

    /******************************************************************************
     * Get Attachment Base64 data from DMS using AttachmentGuid
    /*****************************************************************************/
    async function getAttachmentByGuidFromDMSFunc(sAttachmentGuId) {
        try {
            // Validate attachmentGuId
            if (!sAttachmentGuId || typeof sAttachmentGuId !== ReturnConstants().cGetAttachmentByGuidFromDMS.cString || sAttachmentGuId.trim() === '') {
                throw new cds.error('INVALIDATTACHMENTGUIDPROVIDED', { status: 400 });
            }
            // Connect to DMS destination
            const oDMSBase = await cds.connect.to(ReturnConstants().cGetAttachmentByGuidFromDMS.cDMS);

            // Fetch file metadata from database
            const oFileData = await SELECT.one.from(DAttachment).where({ attachmentGuId: sAttachmentGuId });
            if (!oFileData) {
                throw new cds.error('FILENOTFOUND', { status: 404 });
            }

            // Validate essential DMS properties
            if (!oFileData.dmsFolderPath || !oFileData.dmsFileName || !oFileData.dmsFileId) {
                throw new cds.error('MISSINGDMSPROPERTIESFORFILE', { status: 500 });
            }

            // Build URL to fetch file content
            const sFileURL = `${oFileData.dmsFolderPath}/?cmisselector=content&download=attachment&filename=${oFileData.dmsFileName}&objectId=${oFileData.dmsFileId}`;

            try {
                // Get Base64 content from DMS
                const oResponse = await executeHttpRequest(
                    { destinationName: oDMSBase.destination },
                    {
                        method: ReturnConstants().cGetAttachmentByGuidFromDMS.cGET,
                        headers: { 'Accept': 'application/json' },
                        url: sFileURL
                    }
                );

                if (oResponse && oResponse.data) {
                    let sBase64File = oResponse.data;

                    // Clean up whitespace if any
                    sBase64File = sBase64File.replace(/\s/g, '');
                    oFileData.base64File = sBase64File;
                } else {
                    throw new cds.error('NOFILECONTENTRECEIVEDFROMDMS', { status: 500 });
                }

            } catch (oDmsFetchError) {
                console.error('ERRORFETCHINGFILECONTENTFROMDMS', oDmsFetchError.message);
                throw new cds.error('FAILEDTORETRIEVEFILECONTENTFROMDMS', { status: 500 });
            }

            return oFileData;

        } catch (oError) {
            console.error('ERRORINGETATTACHMENTBYGUIDFROMDMSFUNC', oError.message);
            throw oError;
        }
    }

    /*************************************************************************
    *  Action to call function to fetch Attachment By UUID from DMS
    ***************************************************************************/
    service.on("getAttachmentByGuid", async (oReq) => {

        try {
            const sResult = await getAttachmentByGuidFromDMSFunc(oReq.data.attachmentGuId);
            return sResult;

        } catch (err) {
            oReq.reject(err.status || 500, err.message);
        }

    });

    /***********************************************************
    *  Method to Update Attachment Doc UUID 
    ***********************************************************/
    service.on("updateAttachmentDocGuid", async (oReq) => {
        try {
            const { Files: aFiles } = oReq.data;

            // Validate input
            if (!aFiles || !Array.isArray(aFiles) || aFiles.length === 0) {
                return { message: 'NOFILESPROVIDEDFORUPDATE' };
            }

            for (const oFile of aFiles) {
                // Validate each file object
                if (!oFile.attachmentGuId || !oFile.docGuid) {
                    console.warn('SKIPPINGFILEWITHMISSINGATTACHMENTGUIDORDOCGUID', oFile);
                    continue;
                }

                try {
                    // Update each file's docGuid in the database
                    await UPDATE(DAttachment)
                        .set({ docGuid: oFile.docGuid })
                        .where({ attachmentGuId: oFile.attachmentGuId });
                } catch (oFileUpdateError) {
                    console.error('ERRORUPDATINGDOCGUIDFORATTACHMENTGUID' + oFile.attachmentGuId + ':', oFileUpdateError.message);
                    throw new cds.error('FAILEDTOUPDATEDOCGUIDFORATTACHMENTGUID' + oFile.attachmentGuId);
                }
            }

            return { message: 'DOCUMENTGUIDUPDATEDSUCCESSFULLYFORALLVALIDENTRIES' };

        } catch (oError) {
            console.error('ERRORUPDATINGDOCGUIDS', oError.message);
            oReq.error(500, 'FAILEDTOUPDATEDOCGUIDSDUETOUNEXPECTEDERROR');
        }
    });

    /***********************************************************
                *  Method to Delete Attachment by UUID 
    ***********************************************************/
    service.on("deleteAttachmentFromDMS", async (oReq) => {
        try {
            const oDMSBase = await cds.connect.to(ReturnConstants().cGetAttachmentByGuidFromDMS.cDMS);

            // Extract unique attachmentGuIds from request
            const aGuIds = [...new Set(oReq.data.Files?.map(oFile => oFile.attachmentGuId).filter(sId => !!sId))];

            // Validate if IDs are provided
            if (!Array.isArray(aGuIds) || aGuIds.length === 0) {
                return {
                    success: [],
                    failed: [],
                    fileNotFound: [],
                    message: 'MESSAGENOATTACHMENTGUIDSPROVIDEDINREQUEST'
                };
            }

            // Fetch files from database
            const aFiles = await SELECT.from(DAttachment).where({ attachmentGuId: { in: aGuIds } });
            // Identify found and not found files
            const aFoundGuIds = aFiles.map(oFile => oFile.attachmentGuId);
            const aNotFoundGuIds = aGuIds.filter(sId => !aFoundGuIds.includes(sId));

            const aDeletedFiles = [];
            const aFailedFiles = [];

            for (const oFile of aFiles) {
                try {
                    // Validate essential DMS properties
                    if (!oFile.dmsFileId || !oFile.dmsRepoId) {
                        console.error('MISSINGDMSPROPERTIESFORFILE' + oFile.attachmentGuId);
                        aFailedFiles.push({
                            attachmentGuId: oFile.attachmentGuId,
                            error: 'MESSAGENOATTACHMENTGUIDSPROVIDEDINREQUEST'
                        });
                        continue;
                    }

                    // Prepare form data for delete request
                    const oFormData = new FormData();
                    oFormData.append("cmisaction", "delete");
                    oFormData.append("objectId", oFile.dmsFileId);
                    oFormData.append("allVersions", "true");

                    try {
                        // Execute file delete request
                        const oResponse = await executeHttpRequest(
                            { destinationName: oDMSBase.destination },
                            {
                                method: ReturnConstants().cGetAttachmentByGuidFromDMS.cPOST,
                                url: `/browser/${oFile.dmsRepoId}/root`,
                                headers: {
                                    ...oFormData.getHeaders(),
                                    "Accept": "application/json"
                                },
                                data: oFormData
                            }
                        );

                        // Delete file metadata from local database
                        await DELETE.from(DAttachment).where({ attachmentGuId: oFile.attachmentGuId });

                        aDeletedFiles.push(oFile.attachmentGuId);

                    } catch (oDeleteError) {
                        console.error('ERRORDELETINGFILEFROMDMS', oDeleteError.message);
                        aFailedFiles.push({
                            attachmentGuId: oFile.attachmentGuId,
                            error: oDeleteError.message
                        });
                    }

                } catch (oFileError) {
                    console.error('ERRORPROCESSINGFILE' + oFile.attachmentGuId, oFileError.message);
                    aFailedFiles.push({
                        attachmentGuId: oFile.attachmentGuId,
                        error: oFileError.message
                    });
                }
            }

            const aSuccessfulGuIds = [...aNotFoundGuIds, ...aDeletedFiles];
            let sMessage = "";

            if (aSuccessfulGuIds.length === aGuIds.length && aFailedFiles.length === 0) {
                sMessage = oReq.info(204, 'ALLFILESDELETEDSUCCESSFULLY');
            } else if (aFailedFiles.length > 0 && aSuccessfulGuIds.length > 0) {
                sMessage = oReq.info(204, 'SOMEFILESDELETEDSUCCESSFULLYSOMEFAILED');
            } else if (aFailedFiles.length === aGuIds.length) {
                sMessage = oReq.error(404, 'FAILEDTODELETEALLFILES');
            }

            return {
                success: aSuccessfulGuIds,
                failed: aFailedFiles,
                fileNotFound: aNotFoundGuIds,
                message: sMessage
            };

        } catch (oError) {
            console.error('UNEXPECTEDERRORINDELETEATTACHMENTFROMDMS', oError.message);
            return {
                success: [],
                failed: [],
                fileNotFound: []
            };
        }
    });

    /***********************************************************
      * Method to Over All Status For Vehicle Order Inspection 
    ***********************************************************/
    service.on('overAllStatus', async (req) => {
        try {
            const Payload = req.data;
            let sJsonData = JSON.stringify(Payload);
            sJsonData = sJsonData.replace(/'/g, "''");
            const aMaterialQuery = `${ReturnConstants().cProcedures.cGetOverAllStatus} ('${sJsonData}', RETURNDATA => ?)`;
            const oResult = await cds.db.run(aMaterialQuery);
            return oResult.RETURNDATA;
        } catch (error) {
            throw req.error('ERRORONOVERALLSTATUS' + error.message);
        }
    });

    /***********************************************************
        *Method to Over All Status For Vehicle Order Inspection 
    ***********************************************************/
    service.on('AnprRecapture', async (req) => {
        try {

            const data = req.data;
            data.btpApp = ReturnConstants().itcConstants.cBtpApp;
            let lCheckData;
            let oReturnData
            const connectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            //Calling the ANPR Recapture API.
            const tx = await connectionPost.post(ReturnConstants().destinationCLM.cANPRRecapture, data);

            //ANPR recapture API failure
            if (tx.statusCode != ReturnConstants().ApiResponseStatus.Success) return tx;

            if (tx.statusCode == ReturnConstants().ApiResponseStatus.Success) {
                //Create the payload using by the ANPR recapture.	
                const payload = {
                    siteId: tx.data.siteId,
                    sectionId: tx.data.sectionId,
                    capturedOn: tx.data.capturedOn,
                    plateNumber: tx.data.vehPlateNo,
                    plateSourceCode: tx.data.vehPlateSource,
                    plateSourceEnglish: tx.data.vehPlateSourceDesc,
                    plateColorCode: tx.data.vehPlateColor,
                    plateColorEnglish: tx.data.vehPlateColorDesc,
                    plateKindCode: tx.data.vehPlateKind,
                    plateKindEnglish: tx.data.vehPlateKindDesc,
                    plateTypeCode: tx.data.vehPlateType,
                    plateTypeEnglish: tx.data.vehPlateTypeDesc,
                    cameraNumber: tx.data.cameraNumber,
                    appVersionNumber: tx.data.appVersionNumber,
                    appName: tx.data.appName,
                    vendorId: tx.data.vendorId,
                    hashKey: tx.data.hashKey,
                    plateImage: tx.data.vehPlatePicture,

                }

                //check whether this vehicle info exists in BTP. Insert, if it does not exists.
                lCheckData = await SELECT.from(AnprRecaptureMaster).where({ plateNumber: payload.plateNumber });
                if (lCheckData.length <= 0) {
                    let oAnprRecapture = await INSERT.into(AnprRecaptureMaster).entries(payload);
                }

                //return the data returned by ANPR API
                oReturnData = {
                    plateNumber: tx.data.vehPlateNo,
                    plateSourceCode: tx.data.vehPlateSource,
                    plateSourceEnglish: tx.data.vehPlateSourceDesc,
                    plateColorCode: tx.data.vehPlateColor,
                    plateColorEnglish: tx.data.vehPlateColorDesc,
                    plateKindCode: tx.data.vehPlateKind,
                    plateKindEnglish: tx.data.vehPlateKindDesc,
                    cameraNumber: tx.data.cameraNumber,
                    plateImage: tx.data.vehPlatePicture,
                    capturedOn: tx.data.capturedOn,
                    description: tx.description
                }
            }
            return oReturnData;
        } catch (error) {
            throw req.error('ERRORRECAPTURE' + error.message);
        }
    })

    /******************************************************************************
     * ICT integration
     *****************************************************************************/

    /******************************************************************************
     * Common Function to create the Lookup request dynamically
     *****************************************************************************/

    async function getLookupRequest(lookupName) {
        return {
            "Header": {
                "sourceApp": "CIP_VIC",
                "btpApp": ReturnConstants().itcConstants.cBtpApp,
                "transactionId": cds.utils.uuid()
            },
            "getLookupRequest": {
                "request": {
                    "LookupName": lookupName,
                    "Filter1": "",
                    "Filter2": ""
                }
            }
        };
    }
    /******************************************************************************
     * Common Function to send success response for lookups
     *****************************************************************************/
    async function returnUpsertResponse(lookupName) {
        var date = new Date();
        await UPDATE(VehicleTypeMasterSyncLog)
            .set({ syncDate: date, status: "S", errorMessage: "" })
            .where({ masterType: lookupName })
        return {
            id: cds.utils.uuid(),
            date: date,
            sync: true,
            name: lookupName,
            message: 'MASTERSYNCMSGSUCCESS'
        }

    }
    /******************************************************************************
     * Common Function to send error response for lookups
     *****************************************************************************/
    async function returnErrorResponse(error, lookupName) {
        var date = new Date();
        await UPDATE(VehicleTypeMasterSyncLog)
            .set({ syncDate: date, status: "F", errorMessage: error })
            .where({ masterType: lookupName })
        return {
            id: cds.utils.uuid(),
            date: date,
            sync: false,
            name: lookupName,
            message: error
        }

    }
    /******************************************************************************
     * Action  to call a function that fetches Vehicle Makes from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleMakesInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleMakesInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }

    });


    /******************************************************************************
     * Ffetch Vehicle Makes from ITC and update in BTP
    /*****************************************************************************/

    async function updateVehicleMakesInBTPFromITCFunc() {

        // create a common function .....
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleMake);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;

        let finalArray = [];
        for (const element of result) {

            finalArray.push({
                makeCode: element.Code,
                manufacturerEnglish: element.EnglishDescription,
                manufacturerArabic: element.ArabicDescription
            });

        }

        const upsertResponse = await UPSERT.into(ManufacturerMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleMake);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleMake,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleMake);
        }

    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Models from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleModelsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleModelsInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Models from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleModelsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleModel);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;

        let finalArray = [];
        for (const element of result) {

            finalArray.push({
                modelCode: element.Code,
                modelNameEnglish: element.EnglishDescription,
                modelNameArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await await UPSERT.into(ModelMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleModel);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleModel,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleModel);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Kinds from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleKindsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleKindsInBTPFromITCFunc();
            return vehResponse;

        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Kinds from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleKindsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleKind);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            finalArray.push({
                kindCode: element.Code,
                kindNameEnglish: element.EnglishDescription,
                kindNameArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(VehicleKindMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleKind);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleKind,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleKind);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Types from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleTypesInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleTypesInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Types from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleTypesInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleType);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];
        for (const element of result) {

            finalArray.push({
                typeCode: element.Code,
                typeNameEnglish: element.EnglishDescription,
                typeNameArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(VehicleTypeMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleType);
        } else {

            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleType,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleType);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Colors from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleColorsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleColorsInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Colors from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleColorsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleColor);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(BodyColorMasters).where({ colorCode: element.Code })
            );
            let newKey = exist ? exist.bodyColorUUID : cds.utils.uuid();
            finalArray.push({
                bodyColorUUID: newKey,
                colorCode: element.Code,
                bodyColorEnglish: element.EnglishDescription,
                bodyColorArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(BodyColorMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleColor);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleColor,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleColor);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Nationalities from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateTrfNationalitiesInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateTrfNationalitiesInBTPFromITCFunc();
            return vehResponse;


        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });

    /******************************************************************************
     * Ffetch Nationalities from ITC and update in BTP
    /*****************************************************************************/
    async function updateTrfNationalitiesInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleNationalities);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];
        let finalArrayCountryMaster = [];

        for (const element of result) {
            //countryITCMaster
            const exist = await (
                SELECT.one.from(CountryItcMasters).where({ countrItcCode: element.Code })
            );
            let newKey = exist ? exist.countryItcUUID : cds.utils.uuid();
            finalArray.push({
                countryItcUUID: newKey,
                countrItcCode: element.Code,
                countryNameEnglish: element.EnglishDescription,
                countryNameArabic: element.ArabicDescription
            });

            //countryMaster

            const existCountryMaster = await (
                SELECT.one.from(CountryMasters).where({ countrItcCode: element.Code })
            );
            let newKeyCountryMaster = existCountryMaster ? existCountryMaster.countryUUID : cds.utils.uuid();
            finalArrayCountryMaster.push({
                countryUUID: newKeyCountryMaster,
                countrItcCode: element.Code,
                //countryCode
                countryNameEnglish: element.EnglishDescription,
                countryNameArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(CountryMasters).entries(finalArrayCountryMaster);
        if (upsertResponse && upsertResponse > 0) {
            await UPSERT.into(CountryItcMasters).entries(finalArray);
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleNationalities);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleNationalities,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleNationalities);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Gears from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleGearsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleGearsInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Gears from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleGearsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleGear);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(GearTypeMasters).where({ codeId: element.Code })
            );
            let newKey = exist ? exist.gearTypeUUID : cds.utils.uuid();
            finalArray.push({
                gearTypeUUID: newKey,
                codeId: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(GearTypeMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleGear);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleGear,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleGear);
        }
    }


    /******************************************************************************
     * Action  to call a function that fetches Vehicle Weights from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleWeightsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleWeightsInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Weights from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleWeightsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleWeights);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(WeightKindMasters).where({ weightKindCode: element.Code })
            );
            let newKey = exist ? exist.weightKindUUID : cds.utils.uuid();
            finalArray.push({
                weightKindUUID: newKey,
                weightKindCode: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(WeightKindMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleWeights);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleWeights,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleWeights);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Steerings from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleSteeringsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleSteeringsInBTPFromITCFunc();
            return vehResponse;

        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Types from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleSteeringsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleSteerings);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(SteeringSideMasters).where({ steeringCode: element.Code })
            );
            let newKey = exist ? exist.SteeringSideUUID : cds.utils.uuid();
            finalArray.push({
                SteeringSideUUID: newKey,
                steeringCode: element.Code,
                englishName: element.EnglishDescription,
                arabicName: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(SteeringSideMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleSteerings);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleSteerings,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleSteerings);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Fuel from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehicleFuelsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehicleFuelsInBTPFromITCFunc();
            return vehResponse;

        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Fuel from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehicleFuelsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehicleFuel);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(FuelTypeMasters).where({ codeId: element.Code })
            );
            let newKey = exist ? exist.fuelTypeUUID : cds.utils.uuid();
            finalArray.push({
                fuelTypeUUID: newKey,
                codeId: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(FuelTypeMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehicleFuel);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehicleFuel,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehicleFuel);
        }

    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Plate Source from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehiclePlateSourcesInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehiclePlateSourcesInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Plate Source from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehiclePlateSourcesInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehiclePlateSource);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(VehPlateSourceMasters).where({ codeId: element.Code })
            );
            let newKey = exist ? exist.vehPlateSourceUUID : cds.utils.uuid();
            finalArray.push({
                vehPlateSourceUUID: newKey,
                codeId: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(VehPlateSourceMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehiclePlateSource);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehiclePlateSource,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehiclePlateSource);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Plate Color from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehiclePlateColorsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehiclePlateColorsInBTPFromITCFunc();
            return vehResponse;

        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Plate Color from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehiclePlateColorsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehiclePlateColor);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(VehPlateColorMasters).where({ codeId: element.Code })
            );
            let newKey = exist ? exist.vehPlateColorUUID : cds.utils.uuid();
            finalArray.push({
                vehPlateColorUUID: newKey,
                codeId: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(VehPlateColorMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehiclePlateColor);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehiclePlateColor,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehiclePlateColor);
        }
    }

    /******************************************************************************
     * Action  to call a function that fetches Plate Kinds from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateVehiclePlateKindsInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateVehiclePlateKindsInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Plate Kinds from ITC and update in BTP
    /*****************************************************************************/
    async function updateVehiclePlateKindsInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehiclePlateKind);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(VehPlateKindMasters).where({ codeId: element.Code })
            );
            let newKey = exist ? exist.vehPlateKindUUID : cds.utils.uuid();
            finalArray.push({
                vehPlateKindUUID: newKey,
                codeId: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(VehPlateKindMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehiclePlateKind);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehiclePlateKind,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehiclePlateKind);
        }
    }


    /******************************************************************************
     * Action  to call a function that fetches Card Remarks from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updateRegCardRemarksInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updateRegCardRemarksInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Card Remarks from ITC and update in BTP
    /*****************************************************************************/
    async function updateRegCardRemarksInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cRegCardRemark);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            const exist = await (
                SELECT.one.from(RegCarRemarkMasters).where({ codeId: element.Code })
            );
            let newKey = exist ? exist.regCarRemarkUUID : cds.utils.uuid();
            finalArray.push({
                regCarRemarkUUID: newKey,
                codeId: element.Code,
                codeDescEnglish: element.EnglishDescription,
                codeDescArabic: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(RegCarRemarkMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cRegCardRemark);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cRegCardRemark,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cRegCardRemark);
        }

    }

    /******************************************************************************
     * Action  to call a function that fetches Vehicle Plate Places from ITC and updates in BTP
    /*****************************************************************************/
    service.on('updatePlateAttPlacesInBTPFromITC', async (req) => {
        try {
            const vehResponse = await updatePlateAttPlacesInBTPFromITCFunc();
            return vehResponse;
        } catch (error) {
            throw req.error('CALLINGERROR' + error.message);
        }
    });
    /******************************************************************************
     * Ffetch Vehicle Plate Places from ITC and update in BTP
    /*****************************************************************************/
    async function updatePlateAttPlacesInBTPFromITCFunc() {
        const cPayload = await getLookupRequest(ReturnConstants().masterLookUps.cVehiclePlateAttPlace);

        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleMasterLookup, cPayload);
        let result = responseAutoConfig.getLookupResponse.getLookupResponse.getLookupResult.LookUpRecords.LookupRecord;
        let finalArray = [];

        for (const element of result) {
            finalArray.push({
                Code: element.Code,
                EnglishDescription: element.EnglishDescription,
                ArabicDescription: element.ArabicDescription
            });

        }
        const upsertResponse = await UPSERT.into(PlateATTMasters).entries(finalArray);
        if (upsertResponse && upsertResponse > 0) {
            return await returnUpsertResponse(ReturnConstants().masterLookUps.cVehiclePlateAttPlace);
        } else {
            //inster into logs table
            var errorlog = {
                documentRefNo: null,
                errorResponse: error,
                reqPayload: JSON.stringify(cPayload),
                module: ReturnConstants().cComman.cITCApiMastersUpdate + ReturnConstants().masterLookUps.cVehiclePlateAttPlace,
                endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return await returnErrorResponse('MASTERSYNCMSGFAIL', ReturnConstants().masterLookUps.cVehiclePlateAttPlace);
        }

    }


    /******************************************************************************
     * Action  to call a function that fetches Vehicle Reference from ITC and updates in BTP
    /*****************************************************************************/

    service.on('updateVehicleRefencesInBTPFromITC', async (req) => {
        await updateVehicleRefencesInBTPFromITCFunc();
    })

    /******************************************************************************
     * Ffetch Vehicle Reference from ITC and update in BTP
    /*****************************************************************************/

    async function updateVehicleRefencesInBTPFromITCFunc() {
        var pageNumber = 1;
        var finalArray = [];
        var exitloop = false;
        while (exitloop === false) {
            const cPayload = {
                "Header": {
                    "sourceApp": ReturnConstants().aknowledgementApiConstants.cPayloadSourceApp,
                    "btpApp": ReturnConstants().itcConstants.cBtpApp,
                    "transactionId": cds.utils.uuid()
                },
                "getVehicleReferencesRequest": {
                    "request": {
                        "PageNo": pageNumber

                    }
                }
            }

            const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cVehicleRefernceLookup, cPayload);

            const response = responseAutoConfig?.getVehicleReferencesResponse?.getVehicleReferencesResponse;

            if (response != null) {

                var result = responseAutoConfig.getVehicleReferencesResponse.getVehicleReferencesResponse.getVehicleReferencesResult.VehicleReferencesList.VehicleReferencesRecord;

                for (const element of result) {
                    const exist = await (
                        SELECT.one.from(VehicleLookupConfiguration).where({ makeYear: element.Year, manufacture_makeCode: element.MakeCode, model_modelCode: element.ModelCode, vehicleKind_kindCode: element.KindCode, vehicleType_typeCode: element.TypeCode, cylinder: element.Cylinder, numberOfDoor: element.DoorCount, weightCode: element.WeightCode, emptyWeight: element.WeightEmpty, loadedWeight: element.WeightFull, numberOfWheels: element.WheelsCount, horsePower: element.HorsePower, numberOfAxels: element.AxleCount })
                    );

                    var newKey = exist ? exist.vehLookupConfigUUID : cds.utils.uuid();

                    finalArray.push({
                        vehLookupConfigUUID: newKey,
                        makeYear: element.Year,
                        manufacture_makeCode: parseInt(element.MakeCode),
                        model_modelCode: parseInt(element.ModelCode),
                        vehicleKind_kindCode: parseInt(element.KindCode),
                        vehicleType_typeCode: parseInt(element.TypeCode),
                        cylinder: element.Cylinder,
                        numberOfDoor: element.DoorCount,
                        numberOfPassengers: 0,//as number of passengers are not coming from API
                        weightCode: element.WeightCode,
                        emptyWeight: element.WeightEmpty,
                        loadedWeight: element.WeightFull,
                        numberOfWheels: element.WheelsCount,
                        horsePower: element.HorsePower,
                        numberOfAxels: element.AxleCount
                    });

                }
                pageNumber = parseInt(pageNumber + 1);
            }
            else {
                var errorlog = {
                    documentRefNo: null,
                    errorResponse: ReturnConstants().masterLookUps.cErrorResponse + JSON.stringify(responseAutoConfig),
                    reqPayload: JSON.stringify(cPayload),
                    module: ReturnConstants().masterLookUps.cVehicleReference,
                    endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                    methodCalled: ReturnConstants().masterLookUps.cUpdateVehicleReference
                }
                await INSERT.into(ErrorLogs).entries(errorlog);
                result = response;
                exitloop = true;
            }



        }

        //console.log("finalArray length = ", finalArray.length);
        if (finalArray.length > 0) {
            if (await cds.run(UPSERT.into(VehicleLookupConfiguration).entries(finalArray))) {
                /*return {
                    "id": cds.utils.uuid(),
                    sync: true,
                    name: ReturnConstants().masterLookUps.cUpdateVehRefences,
                    message: ReturnConstants().syncMessage.cMasterSyncMsgSuccess
                }*/

                await returnUpsertResponse(ReturnConstants().aknowledgementApiConstants.cPayloadSourceApp)



            } else {
                console.log('in error');
                var errorlog = {
                    documentRefNo: null,
                    errorResponse: JSON.stringify(error),
                    reqPayload: JSON.stringify(cPayload),
                    module: ReturnConstants().masterLookUps.cVehicleReference,
                    endPoint: ReturnConstants().masterLookUps.cLookupsUrl,
                    methodCalled: ReturnConstants().masterLookUps.cUpdateVehicleReference
                }
                await INSERT.into(ErrorLogs).entries(errorlog);
                return {
                    "id": cds.utils.uuid(),
                    sync: false,
                    name: ReturnConstants().masterLookUps.cUpdateVehicleReference,
                    message: ReturnConstants().syncMessage.cMasterSyncMsgFail
                }
            }
        }
        return result;
    }

    /******************************************************************************
     * Method to get formatted dateTime 
    /*****************************************************************************/

    function formatISOToDateTimeString(isoDateStr) {
        if (!isoDateStr || typeof isoDateStr !== ReturnConstants().cFormatISOToDateTimeString.cString) return null;

        const date = new Date(isoDateStr);

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const dd = String(date.getDate()).padStart(2, '0');

        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const sec = String(date.getSeconds()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;

    }

    /******************************************************************************
     * Method to Send SMS 
    /*****************************************************************************/

    service.on('sendMail', async (req) => {
        return await sendEmailFunc(req.data.email_address, req.data.email_body, req.data.email_subject);
    });

    async function sendEmailFunc(emailaddresss, emailBody, emailsubject) {

        try {

            const destination = await getDestination({
                destinationName: ReturnConstants().EmailConstant.smtpDestName
            });

            if (!destination) {
                throw new Error('SMTPDESTINATIONNOTFOUND');
            }

            const mailConfig = {
                to: emailaddresss,
                subject: emailsubject,
                html: emailBody,
                from: destination.originalProperties[ReturnConstants().EmailConstant.smtpFromAttribute]
            };

            // Ensure your destination 'bpmworkflowruntime_mail' is used
            await sendMail({ destinationName: ReturnConstants().EmailConstant.smtpDestName }, [mailConfig]);

        } catch (error) {
            console.error('EMAILERROR', error);
            return error;
        }
    }


    /******************************************************************************
     * Method to Send SMS 
    /*****************************************************************************/

    service.on('sendSMS', async (req) => {

        return await sendSMSFunc(req.data.mobile_numbers, req.data.message_body);
    });

    /******************************************************************************
     * Method to Send SMS wth JS function
    /*****************************************************************************/


    async function sendSMSFunc(mobileNumbers, messageBody) {
        try {
            if (!Array.isArray(mobileNumbers)) {
                return ReturnConstants().cGeneralError.cMobileArrayError;
            }
            if (typeof messageBody != ReturnConstants().cGeneralError.cString) {
                return ReturnConstants().cGeneralError.cEmailBodyError;
            }
            const smsPayload = {
                mobile_numbers: mobileNumbers,
                system_key: ReturnConstants().smsCredentials.cSmsKey,
                sender_name: ReturnConstants().smsCredentials.cSenderName,
                message_body: messageBody
            };
            const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            const responseAutoConfig = await cs4Destination.post(ReturnConstants().smsCredentials.cSendSmsLookupPath, smsPayload);
            return responseAutoConfig;
        } catch (error) {
            return error.message;
        }
    }

    /******************************************************************************
   * Method to Get Orders for Re-Test
  /*****************************************************************************/
    service.on('getOrdersForRetest', async (req) => {

        const { sOrderNo, sPlateNo, sMobileNo, sPlateSourceCode, sPlateColorCode, sPlateKindCode } = req.data;
        try {

            // Get Material details for all Re-Test orders
            const sQuery = `${ReturnConstants().cProcedures.cGetOrderForReTest} ('${sOrderNo}', '${sPlateNo}', '${sMobileNo}','${sPlateSourceCode}','${sPlateColorCode}','${sPlateKindCode}', RETURNDATA => ?)`;
            const oResponse = await cds.db.run(sQuery);
            const { RETURNDATA = [] } = oResponse || {};

            // Returns all Re-Test Objects
            const transformedResponse = oResponse.RETURNDATA.map(order => {
                return {
                    companyCode: order.COMPANYCODE || null,
                    createdBy: ReturnConstants().cGetOrdersForRetest.cAnonymous,
                    currencyCode: order.CURRENCYCODE,
                    currencyText: order.CURRENCYTEXT || null,
                    customerCode_customerUUID: order.CUSTOMERCODE_CUSTOMERUUID || null,
                    customerName: order.CUSTOMERNAME,
                    division: order.DIVISION || null,
                    modifiedBy: ReturnConstants().cGetOrdersForRetest.cAnonymous,
                    orderCancellationDate: order.ORDERCANCELLATIONDATE || null,
                    orderDate: order.ORDERDATE,
                    orderNo: order.ORDERNO,
                    orderReferenceNo: order.ORDERREFERENCENO || null,
                    orderStatus: order.ORDERSTATUS || null,
                    orderSyncDate: order.ORDERSYNCDATE || null,
                    orderSyncedS4: order.ORDERSYNCEDS4 || null,
                    orderTotal: order.ORDERTOTAL,
                    orderType: order.ORDERTYPE || null,
                    orderUTRRefNo: order.ORDERUTRREFNO || null,
                    paymentDate: order.PAYMENTDATE || null,
                    paymentUTRNo: order.PAYMENTUTRNO || null,
                    plantCode: order.PLANTCODE,
                    plantName: order.PLANTNAME || null,
                    plantRegionCode: order.PLANTREGIONCODE || null,
                    plantRegionName: order.PLANTREGIONNAME || null,
                    requestType: order.REQUESTTYPE || null,
                    salesDivChnl: order.SALESDIVCHNL || null,
                    salesOrganization: order.SALESORGANIZATION || null,
                    serviceRequestNo: order.SERVICEREQUESTNO || null,
                    totalVAT: order.TOTALVAT || null,
                    serviceCode: order.SERVICECODE || null,
                    vehicleOrderInspectionUUID: order.VEHICLEORDERINSPECTIONUUID,
                    VehOrdInspDetails: order.VEHICLEORDERINSPECTIONDETAILSUUID ? [
                        {
                            customerInfo: order.CUSTOMERUUID ? {
                                BPGrouping: order.BPGROUPING,
                                customerUUID: order.CUSTOMERUUID,
                                emailAddress: order.EMAILADDRESS,
                                emiratesId: order.EMIRATESID,
                                extReference: order.EXTREFERENCE,
                                firstName: order.FIRSTNAME,
                                lastName: order.LASTNAME,
                                mobileNo: order.MOBILENO,
                                region: order.REGION
                            } : {},
                            maxTestEndDate: order.MAXTESTENDDATE || null,
                            vehicleMastersUUID: order.VEHICLEDETAILS_VEHICLEMASTERSUUID,
                            plateColorEnglish: order.PLATECOLORENGLISH,
                            plateKindEnglish: order.PLATEKINDENGLISH,
                            plateKindArabic: order.PLATEKINDARABIC,
                            plateKindCode: order.PLATEKINDCODE,
                            plateNumber: order.PLATENUMBER,
                            plateColorCode: order.PLATECOLORCODE,
                            plateColorArabic: order.PLATECOLORARABIC,
                            plateSourceEnglish: order.PLATESOURCEENGLISH,
                            plateSourceArabic: order.PLATESOURCEARABIC,
                            plateSourceCode: order.PLATESOURCECODE,
                            plateTypeCode: order.PLATETYPECODE,
                            plateTypeEnglish: order.PLATETYPEENGLISH,
                            plateTypeArabic: order.PLATETYPEARABIC,
                            insuranceName: order.INSURANCENAME,
                            insuranceKindArabic: order.INSURANCEKINDARABIC,
                            insuranceKindEnglish: order.INSURANCEKINDENGLISH,
                            insuranceExpiry: order.INSURANCEEXPIRY,
                            insurancePolicyNumber: order.INSURANCEPOLICYNUMBER,
                            bodyColorCode: order.BODYCOLORCODE,
                            bodyColorArabic: order.BODYCOLORARABIC,
                            bodyColorEnglish: order.BODYCOLORENGLISH,
                            typeCode: order.TYPECODE,
                            typeArabic: order.TYPEARABIC,
                            typeEnglish: order.TYPEENGLISH,
                            nationalityCode: order.NATIONALITYCODE,
                            nationalityArabic: order.NATIONALITYARABIC,
                            nationalityEnglish: order.NATIONALITYENGLISH,
                            insuranceExpiry: order.INSURANCEEXPIRY,
                            manfacturerCode: order.MANFACTURERCODE,
                            manfacturerArabic: order.MANFACTURERARABIC,
                            manfacturerEnglish: order.MANFACTURERENGLISH,
                            modelCode: order.MODELCODE,
                            modelArabic: order.MODELARABIC,
                            modelEnglish: order.MODELENGLISH,
                            kindCode: order.KINDCODE,
                            kindArabic: order.KINDARABIC,
                            kindEnglish: order.KINDENGLISH,
                            emptyWeight: order.EMPTYWEIGHT,
                            fullWeight: order.FULLWEIGHT,
                            registrationDate: order.REGISTRATIONDATE,
                            registrationExpiryDate: order.REGISTRATIONEXPIRYDATE,
                            engineNumber: order.ENGINENUMBER,
                            chasisNumber: order.CHASISNUMBER,
                            gearTypeCode: order.GEARTYPECODE,
                            gearTypeArabic: order.GEARTYPEARABIC,
                            gearTypeEnglish: order.GEARTYPEENGLISH,
                            fuelTypeCode: order.FUELTYPECODE,
                            fuelArabicDesc: order.FUELTYPEARABIC,
                            fuelTypeEnglish: order.FUELTYPEENGLISH,
                            weightDiscCode: order.WEIGHTDISCCODE,
                            weightDiscArabic: order.WEIGHTDISCARABIC,
                            weightDiscEnglish: order.WEIGHTDISCENGLISH,
                            steeringSideCode: order.STEERINGSIDECODE,
                            steeringSideArabic: order.STEERINGSIDEARABIC,
                            steeringSideEnglish: order.STEERINGSIDEENGLISH,
                            numberOfCylinders: order.NUMBEROFCYLINDERS,
                            numberOfAxel: order.NUMBEROFAXEL,
                            numberOfDoors: order.NUMBEROFDOORS,
                            horsePower: order.HORSEPOWER,
                            numberOfWheels: order.NUMBEROFWHEELS,
                            inspectionByUser: order.INSPECTIONBYUSER,
                            inspectionCompletedDateTime: order.INSPECTIONCOMPLETEDDATETIME,
                            inspectionStartDateTime: order.INSPECTIONSTARTDATETIME,
                            laneCode: order.LANECODE,
                            lockedBy: order.LOCKEDBY,
                            lockedByDateTime: order.LOCKEDBYDATETIME,
                            onHoldDateTime: order.ONHOLDDATETIME,
                            plantCode: order.PLANTCODE,
                            remarks: order.REMARKS,
                            status: order.STATUS,
                            orderDate: order.ORDERDATE,
                            registrationYear: order.REGISTRATIONYEAR,
                            orderNo: order.SERVICEREQUESTNO,
                            mobileNo: order.MOBILENO,
                            vehicleOrderInspectionDetailsUUID: order.VEHICLEORDERINSPECTIONDETAILSUUID,
                            vehicleOrderInspections_vehicleOrderInspectionUUID: order.VEHICLEORDERINSPECTIONUUID,
                            vehicleMastersUUID: order.VEHICLEMASTERSUUID,
                            vehOrdInspLines: order.VEHICLEORDERINSPECTIONLINES ? [
                                {
                                    currencyCode: order.CURRENCYCODE,
                                    currencyText: order.CURRENCYTEXT,
                                    delMark: order.DELMARK,
                                    inspectionType: order.INSPECTIONTYPE,
                                    lineTotal: order.LINETOTAL,
                                    materialCode: order.MATERIALCODE,
                                    materialGroup: order.MATERIALGROUP,
                                    materialName: order.MATERIALNAME,
                                    materialNameArabic: order.MATERIALNAMEARABIC,
                                    materialType: order.MATERIALTYPE,
                                    orderLineNo: order.ORDERLINENO,
                                    overallTestStatus: order.OVERALLTESTSTATUS,
                                    quantity: order.QUANTITY,
                                    totalWithOutVAT: order.TOTALWITHOUTVAT,
                                    totalWithVAT: order.TOTALWITHVAT,
                                    unitPrice: order.UNITPRICE,
                                    vat: order.VAT,
                                    vatCode: order.VATCODE,
                                    serviceCode: order.SERVICECODE || null,
                                    childOrderNo: order.CHILDORDERNO_VEHICLEORDERINSPECTIONUUID,
                                    childSeviceRequestNo: order.CHILDSEVICEREQUESTNO,
                                    childMaterialCode: order.CHILDMATERIALCODE,
                                    childOrderLineNo: order.CHILDORDERLINENO,
                                    vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID: order.VEHICLEORDERINSPECTIONDETAILSUUID,
                                    vehicleOrderInspectionLines: order.VEHICLEORDERINSPECTIONLINES,
                                    retestCount: order.RETESTCOUNT,
                                    vehOrdInspLinesTestChars: order.VEHICLEORDERINSPECTIONLINESTESTCHARUUID ? [
                                        {
                                            VehicleOrderInspectionLinesTestCharUUID: order.VEHICLEORDERINSPECTIONLINESTESTCHARUUID,
                                            applicableTestName: order.APPLICABLETESTNAME,
                                            testComments: order.TESTCOMMENTS,
                                            testInspectedBy: order.TESTINSPECTEDBY,
                                            testInspectionStartDate: order.TESTINSPECTIONSTARTDATE,
                                            testInspectionEndDate: order.TESTINSPECTIONENDDATE,
                                            testStatus: order.TESTSTATUS,
                                            vehicleOrderInspectionLines_vehicleOrderInspectionLines: order.VEHICLEORDERINSPECTIONLINES_VEHICLEORDERINSPECTIONLINES
                                        }
                                    ] : []
                                }

                            ] : []
                        }
                    ] : []
                };
            });
            return transformedResponse;

        } catch (err) {
            req.error('ERRORMESSAGEFORRETEST', err);
            throw { error: 'ERRORMESSAGEFORRETEST', details: err.message };
        }
    });

    /******************************************************************************
    * Method for get the Materials
    /*****************************************************************************/
    service.on('getMaterialDetails', async (req) => {
        try {
            const { sCurDate, sDstributionChannel, sSalesOrganization, sRegion, sPlantCode, sListType, sFromTime, sToTime, sPlateSource, sVehicleType, sVehicleYear, sTestType, sPlateNumber, oFilter } = req.data;

            // === Input validation ===
            if (!sCurDate || typeof sCurDate !== ReturnConstants().cMaterialMessage.cString || sCurDate.trim() === '') {
                return req.error(400, 'CURDATE');
            }
            if (!sPlantCode || typeof sPlantCode !== ReturnConstants().cMaterialMessage.cString || sPlantCode.trim() === '') {
                return req.error(400, 'PLANTCODE');
            }
            if (!sTestType || typeof sTestType !== ReturnConstants().cMaterialMessage.cString || sTestType.trim() === '') {
                return req.error(400, 'TESTTYPE');
            }

            let aFilteredMaterials = [];
            const oWrappedFilter = { oFilter };
            let sJsonData = JSON.stringify(oWrappedFilter);
            sJsonData = sJsonData.replace(/'/g, "''");

            const aMaterialQuery = `${ReturnConstants().cProcedures.cGetMaterials} ('${sPlantCode}', '${sCurDate}', '${sTestType}','${sDstributionChannel}','${sSalesOrganization}','${sRegion}','${sListType}','${sFromTime}','${sToTime}','${sPlateSource}','${sVehicleType}','${sVehicleYear}','${sPlateNumber}', '${sJsonData}', O_JSON => ? , O_MODIFIED => ?)`;
            const aMaterialResult = await cds.db.run(aMaterialQuery);

            let sRawJson = aMaterialResult.O_JSON.toString('utf8').replace(/[\u0000-\u0019]+/g, '');
            let sParsedJson;


            let oModifiedData;
            let oParsedModifiedJson;
            let aModifiedMaterial = [];
            if (aMaterialResult.O_MODIFIED != null) {
                oModifiedData = aMaterialResult.O_MODIFIED.toString('utf8').replace(/[\u0000-\u0019]+/g, '');
            }


            if (oModifiedData && oModifiedData.trim() !== '') {
                try {
                    oParsedModifiedJson = JSON.parse(oModifiedData);
                    aModifiedMaterial = oParsedModifiedJson; // assign after successful parse
                } catch (err) {
                    req.error('PARSEDJSONERROR', err.message);
                    return [];
                }
            } else {
                oParsedModifiedJson = []; 
                aModifiedMaterial = [];
            }


            try {
                sParsedJson = JSON.parse(sRawJson);
            } catch (err) {
                req.error('PARSEDJSONERROR', err.message);
                return [];
            }

            const upperTestType = sTestType.toUpperCase();

            if (upperTestType === ReturnConstants().inspectionType.cFreshTest || upperTestType === ReturnConstants().inspectionType.cPermitTest || upperTestType === ReturnConstants().inspectionType.cChangeInfoTest || upperTestType === ReturnConstants().inspectionType.cTransferTest || upperTestType === ReturnConstants().inspectionType.cAccessoriesTest || upperTestType === ReturnConstants().inspectionType.cAllServicesTest) {
                if (Array.isArray(sParsedJson)) {
                    aFilteredMaterials = sParsedJson;
                    aModifiedMaterial = oParsedModifiedJson;
                } else {
                    req.error('ERRORFORFRESHTEST');
                    return [];
                }
            }
            aFilteredMaterials.sort((a, b) => (b.ORDERBY || 0) - (a.ORDERBY || 0));

            if (upperTestType === ReturnConstants().inspectionType.cRetestTest) {
                if (!Array.isArray(sParsedJson)) {
                    req.error('ERRORFORRETEST');
                    return [];
                }

                aFilteredMaterials = sParsedJson.filter(material => {
                    const materialCode = material?.MATERIALCODE?.trim();
                    if (!materialCode) return true;

                    const existsInFilter = oFilter.some(char => char.serviceCode === materialCode && material.PLATENUMBER === 'NULL');
                    return !existsInFilter;
                });

                aFilteredMaterials.sort((a, b) => (b.ORDERBY || 0) - (a.ORDERBY || 0));
                let aReTestMaterial = [];
                aFilteredMaterials.forEach(item => {
                    if (Array.isArray(item.MATERIALCHARACTERISTIC)) {
                        item.MATERIALCHARACTERISTIC.forEach(SubItem => {
                            if (SubItem.CHARDESCRIPTION === ReturnConstants().applicableNames.cRetestId) {
                                aReTestMaterial.push(SubItem);
                            }
                        });
                    }
                });

                aFilteredMaterials = aFilteredMaterials.filter(material => {
                    const materialCode = material?.MATERIALCODE?.trim();
                    if (!materialCode) return true;
                    const isRetest = aReTestMaterial.some(char => char.CHARVALUE === materialCode && material.PLATENUMBER == 'NULL');
                    return !isRetest;
                });
            }


            let oFinalData = {};

            if (Array.isArray(aModifiedMaterial) && Array.isArray(aFilteredMaterials)) {
                oFinalData.aFilteredMaterials = aFilteredMaterials;
                oFinalData.aModifiedMaterial = aModifiedMaterial;
            }
            else {
                oFinalData.aFilteredMaterials = [];
                oFinalData.aModifiedMaterial = [];
            }
            return oFinalData;

        } catch (Error) {
            req.error('ERRORMESSAGE', Error);
            throw req.error('ERRORMESSAGE' + Error.message);
        }
    });

    /******************************************************************************
     * Method to Call Payload validation 
    /*****************************************************************************/

    async function validatedPayload(payload) {
        let payloadData = payload.setInspectionResult.setInspectionResultRequest.request;

        var error = '';
        if (!payloadData.SystemCode || payloadData.SystemCode == null || typeof (payloadData.SystemCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cSystemCode + payloadData.SystemCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.ChassisNo || payloadData.ChassisNo == null) {
            error = error + ReturnConstants().cValidatedPayload.cChassisNo + payloadData.ChassisNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.OldChassisNo || payloadData.OldChassisNo == null) {
            error = error + ReturnConstants().cValidatedPayload.cChassisNo + payloadData.OldChassisNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.ReferenceNo || payloadData.ReferenceNo == null) {
            error = error + ReturnConstants().cValidatedPayload.cReferenceNo + payloadData.ReferenceNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.IsPassed == null) {
            error = error + ReturnConstants().cValidatedPayload.cIsPassed + payloadData.IsPassed + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.IsPassed) != ReturnConstants().cValidatedPayload.cBoolean) {
            error = error + ReturnConstants().cValidatedPayload.cIsPassed + payloadData.IsPassed + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.InspectionDate || payloadData.InspectionDate == null) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionDate + payloadData.InspectionDate + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.InspectionCenterCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionCenterCode + payloadData.InspectionCenterCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.InspectionCenterCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionCenterCode + payloadData.InspectionCenterCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.VehicleMakeCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleColorCode + payloadData.VehicleMakeCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.VehicleMakeCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleMakeCode + payloadData.VehicleMakeCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.VehicleModelCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleModelCode + payloadData.VehicleModelCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.VehicleModelCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleModelCode + payloadData.VehicleModelCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.VehicleKindCode || payloadData.VehicleKindCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleKindCode + payloadData.VehicleKindCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.VehicleKindCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleModelCode + payloadData.VehicleKindCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.VehicleTypeCode || payloadData.VehicleTypeCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleTypeCode + payloadData.VehicleTypeCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.VehicleTypeCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleTypeCode + payloadData.VehicleTypeCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.VehicleColorCode || payloadData.VehicleColorCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleColorCode + payloadData.VehicleColorCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.VehicleColorCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleColorCode + payloadData.VehicleColorCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.VehicleNationalityCode || payloadData.VehicleNationalityCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleNationalityCode + payloadData.VehicleNationalityCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.VehicleNationalityCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleNationalityCode + payloadData.VehicleNationalityCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.EngineNo || payloadData.EngineNo == null) {
            error = error + ReturnConstants().cValidatedPayload.cEngineNo + payloadData.EngineNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.VehicleMakingYear || payloadData.VehicleMakingYear == null) {
            error = error + ReturnConstants().cValidatedPayload.cVehicleMakingYear + payloadData.VehicleMakingYear + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.Cylinders || payloadData.Cylinders == null) {
            error = error + ReturnConstants().cValidatedPayload.cCylinders + payloadData.Cylinders + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.Cylinders) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cCylinders + payloadData.Cylinders + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.Axles || payloadData.Axles == null) {
            error = error + ReturnConstants().cValidatedPayload.cAxles + payloadData.Axles + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.Axles) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cAxles + payloadData.Axles + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.Doors || payloadData.Doors == null) {
            error = error + ReturnConstants().cValidatedPayload.cDoors + payloadData.Doors + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.Doors) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cDoors + payloadData.Doors + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.Chairs || payloadData.Chairs == null) {
            error = error + ReturnConstants().cValidatedPayload.cChairs + payloadData.Chairs + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.Chairs) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cChairs + payloadData.Chairs + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.HorsePower || payloadData.HorsePower == null) {
            error = error + ReturnConstants().cValidatedPayload.cHorsePower + payloadData.HorsePower + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.HorsePower) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cHorsePower + payloadData.HorsePower + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.WeightFull || payloadData.WeightFull == null) {
            error = error + ReturnConstants().cValidatedPayload.cWeightFull + payloadData.WeightFull + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.WeightFull) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cWeightFull + payloadData.WeightFull + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.WeightEmpty || payloadData.WeightEmpty == null) {
            error = error + ReturnConstants().cValidatedPayload.cWeightEmpty + payloadData.WeightEmpty + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.WeightEmpty) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cWeightEmpty + payloadData.WeightEmpty + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.Wheels || payloadData.Wheels == null) {
            error = error + ReturnConstants().cValidatedPayload.cWheels + payloadData.Wheels + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.Wheels) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cWheels + payloadData.Wheels + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.GearCode || payloadData.GearCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cGearCode + payloadData.GearCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.GearCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cGearCode + payloadData.GearCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.WeightKindCode || payloadData.WeightKindCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cWeightKindCode + payloadData.WeightKindCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.WeightKindCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cWeightKindCod + payloadData.WeightKindCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.SteeringCode || payloadData.SteeringCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cSteeringCode + payloadData.SteeringCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.SteeringCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cSteeringCode + payloadData.SteeringCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.FuelCode || payloadData.FuelCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cFuelCode + payloadData.FuelCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.FuelCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cFuelCode + payloadData.FuelCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.PurposeCode == null || isNaN(payloadData.PurposeCode)) {
            error = error + ReturnConstants().cValidatedPayload.cPurposeCode + payloadData.PurposeCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.PurposeCode) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cPurposeCode + payloadData.PurposeCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.IsClassicVehicle == null) {
            error = error + ReturnConstants().cValidatedPayload.cIsClassicVehicle + payloadData.IsClassicVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.IsClassicVehicle) != ReturnConstants().cValidatedPayload.cBoolean) {
            error = error + ReturnConstants().cValidatedPayload.cIsClassicVehicle + payloadData.IsClassicVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.IsHandicappedVehicle == null) {
            error = error + ReturnConstants().cValidatedPayload.cIsHandicappedVehicle + payloadData.IsHandicappedVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.IsHandicappedVehicle) != ReturnConstants().cValidatedPayload.cBoolean) {
            error = error + ReturnConstants().cValidatedPayload.cIsHandicappedVehicle + payloadData.IsHandicappedVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.IsModifiedVehicle == null) {
            error = error + ReturnConstants().cValidatedPayload.cIsModifiedVehicle + payloadData.IsModifiedVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.IsModifiedVehicle) != ReturnConstants().cValidatedPayload.cBoolean) {
            error = error + ReturnConstants().cValidatedPayload.cIsModifiedVehicle + payloadData.IsModifiedVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.IsClassicForShowRoom == null) {
            error = error + ReturnConstants().cValidatedPayload.cIsClassicForShowRoom + payloadData.IsClassicForShowRoom + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.IsClassicForShowRoom) != ReturnConstants().cValidatedPayload.cBoolean) {
            error = error + ReturnConstants().cValidatedPayload.cIsClassicForShowRoom + payloadData.IsClassicForShowRoom + ReturnConstants().cGeneralError.cInvalid;
        }

        if (payloadData.InspectionFees == null) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionFees + payloadData.InspectionFees + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.InspectionFees) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionFees + payloadData.InspectionFees + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.OdometerCurrentRead == null) {
            error = error + ReturnConstants().cValidatedPayload.cOdometerCurrentRead + payloadData.OdometerCurrentRead + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.OdometerPreviousRead == null) {
            error = error + ReturnConstants().cValidatedPayload.cOdometerPreviousRead + payloadData.OdometerPreviousRead + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.IsArmedVehicle == null) {
            error = error + ReturnConstants().cValidatedPayload.cIsArmedVehicle + payloadData.IsArmedVehicle + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.LaneNo == null || typeof payloadData.LaneNo == 'undefined') {
            console.log(payloadData.LaneNo);
            error = error + ReturnConstants().cValidatedPayload.cLaneNo + payloadData.LaneNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!payloadData.LaneNo) {
            console.log(payloadData.LaneNo);
            error = error + ReturnConstants().cValidatedPayload.cLaneNo + payloadData.LaneNo + ReturnConstants().cGeneralError.cInvalid;
        }

        if (payloadData.InspectorEID == null) {
            error = error + ReturnConstants().cValidatedPayload.cInspectorEID + payloadData.InspectorEID + ReturnConstants().cGeneralError.cInvalid;
        }
        if (typeof (payloadData.InspectorEID) != ReturnConstants().cValidatedPayload.cNumber) {
            error = error + ReturnConstants().cValidatedPayload.cInspectorEID + payloadData.InspectorEID + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.RegistrationCardRemarksCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cRegistrationCardRemarksCode + payloadData.RegistrationCardRemarksCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.RegistrationCardRemarksCode.trim() == '') {
            error = error + ReturnConstants().cValidatedPayload.cRegistrationCardRemarksCode + payloadData.RegistrationCardRemarksCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (error == '') {
            return true;
        } else {
            return error;
        }

    }

    service.after('CREATE', 'VehicleOrderInspections', async (req) => {
        try {
            let UTRNGeneratedNumber = await generateUTRNNumber(req);
            if (UTRNGeneratedNumber != undefined || null) {
                await cds.run(UPDATE(VehicleOrderInspections).set({ orderUTRRefNo: UTRNGeneratedNumber }).where({ vehicleOrderInspectionUUID: req.vehicleOrderInspectionUUID }));
            } else {
                console.log(ReturnConstants().cMaterialMessage.cErrorMessagegeneretingUTRN + UTRNGeneratedNumber);
            }

            let aManageData = [];
            let aTestResultPermit = [];
            req.VehOrdInspDetails.filter(Item => {
                Item.vehOrdInspLines.filter(ItemLine => {
                    ItemLine.vehOrdInspLinesTestChars.filter(ItemChar => {
                        if (ItemChar.applicableTestName === ReturnConstants().applicableNames.cPermitTest) {
                            let data = {
                                plantCode: Item.plantCode,
                                plantName: Item.plantName,
                                laneCode: Item.laneCode,
                                materialCode: ItemLine.materialCode,
                                materialName: ItemLine.materialName,
                                materialNameArabic: ItemLine.materialNameArabic,
                                materialType: ItemLine.materialNameArabic,
                                applicableTestName: ItemChar.applicableTestName,
                                VehicleOrderInspectionLinesTestCharUUID: ItemChar.VehicleOrderInspectionLinesTestCharUUID

                            }
                            aManageData.push(data);
                        }
                    });
                });
            });
            for (const Item of aManageData) {

                if (Item.materialCode == ReturnConstants().EmbossingItem.Embossing_1) {
                    const oResult = await cds.run(SELECT.one.from(ReEmbossNum).where({ plantCode: Item.plantCode }));
                    if (!oResult) {
                        return;
                    }
                    let result = await cds.run(SELECT.one.from(PlantMasters).where({ plantCode: Item.plantCode }));
                    let sGenretedNo = null;
                    if (oResult.currNumber == '' || oResult.currNumber == null) {
                        sGenretedNo = Number(oResult.fromNumber) + 1;
                    } else {
                        sGenretedNo = Number(oResult.currNumber) + 1;
                    }

                    const FinalNumber = result.countryCode + ReturnConstants().EmbossingItem.StringValue + result.legacySiteNo + sGenretedNo;


                    let data = {
                        materialCode: Item.materialCode,
                        serviceTypeValue: sGenretedNo,
                        serviceTypeTextEng: FinalNumber,
                        vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: Item.VehicleOrderInspectionLinesTestCharUUID
                    };
                    await cds.run(UPDATE(ReEmbossNum).set({ currNumber: sGenretedNo }).where({ plantCode: Item.plantCode }));
                    const aTestTypePermit = await INSERT.into(TestResultsPermit).entries(data);
                }

            }
        } catch (error) {
            throw new Error('ERRORMESSAGEREEMBOSSING' + error.message);
        }
    })
    /******************************************************************************************
     * Function to get current date time string
    /*****************************************************************************************/

    function getCurrentDateTimeString() {
        const now = new Date();
        const formatted = now.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        return formatted.replace(',', '');
    }
    /******************************************************************************************
     * Function to get current function name
    /*****************************************************************************************/
    function getCurrentFunctionName() {
        const err = new Error();
        const stackLine = err.stack.split('\n')[2]; // 3rd line has caller info
        const match = stackLine.match(/at (\S+)/);
        return match ? match[1] : 'anonymous';
    }

    /***********************************************************
    *Method To process Line Items For Acknowledgement
    ***********************************************************/
    async function processLineItemsForAcknowledgementFunc() {
        var errors = [];
        var successPayload = [];
        var errorlog = [];
        var responseOrders = [];
        var logString = "****************************Execution of the Program Started at " + getCurrentDateTimeString() + "****************************";

        //getting SO lineitems
        let result = await cds.run(ReturnConstants().cProcedures.cGetSoLineItems);
        result = result.OUT_RESULT;

        logString = logString + ReturnConstants().Notification.totalRecordProcessed + result.length + ReturnConstants().cSoLineItes.cMasterTableName;
        for (const item of result) {

            var purposeCode = await cds.run(SELECT.one.from(PurposeMasters).where({ materialCode: item.MATERIALCODE, laneTypeCode: item.LANETYPECODE }));
            purposeCode = purposeCode ? purposeCode.purposeCode : 1;

            //var serviceRequestNo = item.PLANTCODE.slice(-3) + item.ORDERNO.slice(-7) + String(item.ORDERLINENO).padStart(4, '0');
            var serviceRequestNo = item.PLANTCODE.slice(-3) + item.ORDERNO.slice(-7) + String(item.ORDERLINENO).slice(-2);

            var oldChesisnumber = item.CHASISNUMBER;
            var oldMmileage = item.MILEAGE;
            // getting change vehicle information in case of VI_CHANGE_VEHICLE_INFO


            let vehicleInfoResult = await cds.run(`${ReturnConstants().cProcedures.cChangeVehicleInfoProcedure} ('${item.VEHICLEORDERINSPECTIONLINES}','${ReturnConstants().applicableNames.cChangeVehicleInfo}','${ReturnConstants().changeVehicleInfoFields.cChassisNum}','${ReturnConstants().changeVehicleInfoFields.cMmileage}',OUT_RESULT => ?)`);

            vehicleInfoResult = vehicleInfoResult.OUT_RESULT;

            if (Array.isArray(vehicleInfoResult) && vehicleInfoResult.length) {
                for (let changeItem of vehicleInfoResult) {

                    if (changeItem.FIELDLABELENGLISH == ReturnConstants().changeVehicleInfoFields.cChassisNum) {
                        var oldChesisnumber = changeItem.OLDTEXTENGLISH ?? item.CHASISNUMBER;
                    }
                    if (changeItem.FIELDLABELENGLISH == ReturnConstants().changeVehicleInfoFields.cMmileage) {
                        oldMmileage = (!changeItem.MILEAGE || changeItem.MILEAGE === 'N/A') ? 0 : parseInt(item.MILEAGE);

                    }
                }
            }

            var overAllStatus = false;
            if (item.OVERALLTESTSTATUS == ReturnConstants().cProcessLineItems.cItemPassedText) {
                overAllStatus = true;
            }

            //getting InspectionCenterCode from PLANTCODE

            let plantItcCode = await cds.db.run(`${ReturnConstants().cProcedures.cItcPlantDataProcedure} ('${item.PLANTCODE}', PLANT_ITC_CODE => ?)`);

            const laneItcCode = await cds.run(SELECT.one.from(AnprPlantLaneConfigs).where({ plantCode: item.PLANTCODE, laneCode: item.LANECODE }));

            //generating actual payload which needs to send for Acknowledgement
            var payload =
            {
                "setInspectionResult": {
                    "Header": {
                        "btpApp": ReturnConstants().itcConstants.cBtpApp,
                        "sourceApp": ReturnConstants().aknowledgementApiConstants.cPayloadSourceApp
                    },
                    "setInspectionResultRequest": {
                        "request": {
                            "SystemCode": ReturnConstants().aknowledgementApiConstants.cPayloadSystemCode,
                            "ChassisNo": item.CHASISNUMBER ?? null,
                            "OldChassisNo": oldChesisnumber ?? null,
                            "ReferenceNo": parseInt(serviceRequestNo) ?? null,
                            "IsPassed": overAllStatus ?? null,//is passed true in only case of true else false need to confirm for permit
                            "InspectionDate": item.CREATEDAT ? item.CREATEDAT.replace(' ', 'T').split('.')[0] : null,
                            "InspectionCenterCode": plantItcCode.PLANT_ITC_CODE ? parseInt(plantItcCode.PLANT_ITC_CODE) : 1,
                            "VehicleMakeCode": item.MANFACTURERCODE ? parseInt(item.MANFACTURERCODE) : null,
                            "VehicleModelCode": item.MODELCODE ? parseInt(item.MODELCODE) : null,
                            "VehicleKindCode": item.KINDCODE ? parseInt(item.KINDCODE) : null,
                            "VehicleTypeCode": item.TYPECODE ? parseInt(item.TYPECODE) : null,
                            "VehicleColorCode": item.BODYCOLORCODE ? parseInt(item.BODYCOLORCODE) : null,
                            "VehicleNationalityCode": item.NATIONALITYCODE ? parseInt(item.NATIONALITYCODE) : null,
                            "EngineNo": item.ENGINENUMBER ? item.ENGINENUMBER : null,
                            "VehicleMakingYear": item.MANUFACTURINGYEAR ? parseInt(item.MANUFACTURINGYEAR) : null,
                            "Cylinders": item.NUMBEROFCYLINDERS ? parseInt(item.NUMBEROFCYLINDERS) : null,
                            "Axles": item.NUMBEROFAXEL ? parseInt(item.NUMBEROFAXEL) : null,
                            "Doors": item.NUMBEROFDOORS ? parseInt(item.NUMBEROFDOORS) : null,
                            "Chairs": item.NUMBEROFPASSENGERS ? parseInt(item.NUMBEROFPASSENGERS) : null,
                            "HorsePower": item.HORSEPOWER ? parseInt(item.HORSEPOWER) : null,
                            "WeightFull": item.FULLWEIGHT ? parseInt(item.FULLWEIGHT) : null,
                            "WeightEmpty": item.EMPTYWEIGHT ? parseInt(item.EMPTYWEIGHT) : null,
                            "Wheels": item.NUMBEROFWHEELS ? parseInt(item.NUMBEROFWHEELS) : null,
                            "GearCode": item.GEARTYPECODE ? parseInt(item.GEARTYPECODE) : null,
                            "WeightKindCode": item.WEIGHTDISCCODE ? parseInt(item.WEIGHTDISCCODE) : null,
                            "SteeringCode": item.STEERINGSIDECODE ? parseInt(item.STEERINGSIDECODE) : null,
                            "FuelCode": item.FUELTYPECODE ? parseInt(item.FUELTYPECODE) : null,
                            "PurposeCode": parseInt(purposeCode),
                            "IsClassicVehicle": item.ISCLASSICVEHICLE ? Boolean(item.ISCLASSICVEHICLE) : false,
                            "IsHandicappedVehicle": item.ISHANDICAPPEDVEHICLE ? Boolean(item.ISHANDICAPPEDVEHICLE) : false,
                            "IsModifiedVehicle": item.ISMODIFIEDVEHICLE ? Boolean(item.ISMODIFIEDVEHICLE) : false,
                            "IsClassicForShowRoom": item.ISCLASSICFORSHOWROOM ? Boolean(item.ISCLASSICFORSHOWROOM) : false,
                            "InspectionFees": item.TOTALWITHVAT ? parseFloat(item.TOTALWITHVAT) : null,
                            //"OdometerCurrentRead": item.MILEAGE ? parseInt(item.MILEAGE) : "0",
                            "OdometerCurrentRead": (!item.MILEAGE || item.MILEAGE === 'N/A') ? 0 : parseInt(item.MILEAGE),

                            "OdometerPreviousRead": oldMmileage ?? "0",
                            "OdometerPreviousRead": (!oldMmileage || oldMmileage === 'N/A') ? 0 : parseInt(oldMmileage),
                            "IsArmedVehicle": item.ISARMEDVEHICLE ? Boolean(item.ISARMEDVEHICLE) : false,
                            //"LaneNo": parseInt(laneItcCode?.laneItcCode) ?? null,//chk and verify
                            "LaneNo": 2,
                            "InspectorEID": ReturnConstants().aknowledgementApiConstants.cPayloadInspectorEID,
                            "RegistrationCardRemarksCode": item.REGCARREMARKCODE ? item.REGCARREMARKCODE : "2",
                            "Comments": item.TESTCOMMENTS ? item.TESTCOMMENTS : null,
                            "UserID": ReturnConstants().aknowledgementApiConstants.cPayloadUserID
                        }
                    }
                }
            };

            //return payload;
            //validate the payload 
            var validatePayload = await validatedPayload(payload);


            //getting only 'VI_SEND_TO_ITC' Characteristics
            console.log(item.VEHICLEORDERINSPECTIONLINES, "==", item.SERVICEREQUESTNO);

            let sendToItcCharacteristicsResult = await cds.db.run(`${ReturnConstants().cProcedures.cGetSendtoItcCharacteristicsProcedure} ('${item.VEHICLEORDERINSPECTIONLINES}', OUT_RESULT => ?)`);

            sendToItcCharacteristicsResult = sendToItcCharacteristicsResult.OUT_RESULT;

            if (sendToItcCharacteristicsResult.length == 0) {
                validatePayload = validatePayload + ReturnConstants().cValidatedPayload.cViSentToItcFalse;
            }

            if (validatePayload === true && sendToItcCharacteristicsResult.length > 0) {
                try {
                    //calling the destination

                    const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
                    //calling the Acknowledgement API with validated payload
                    const responseAutoConfig = await cs4Destination.post(ReturnConstants().aknowledgementApiConstants.cMasterApiDesinationPath, payload);

                    var resultApi = responseAutoConfig.setInspectionResultResponse.setInspectionResultResponse.setInspectionResultResult;
                    var apiStatus = responseAutoConfig.setInspectionResultResponse.responseStatus.statusCode;

                    //perform update query to update acknowledgementNo 
                    if (resultApi && resultApi.SerialNo != null && apiStatus == "0") {
                        logString = logString + ReturnConstants().cProcessLineItems.cForPlateNumber + item.PLATENUMBER + ReturnConstants().cProcessLineItems.cSrReqNumber + item.SERVICEREQUESTNO + ReturnConstants().cProcessLineItems.cGotAckNum + resultApi.SerialNo + ReturnConstants().cProcessLineItems.cForOrderNum + item.ORDERNO + ReturnConstants().cProcessLineItems.cMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cMaterialName + item.MATERIALNAME + "'\n";

                        //update the ACKNOWLEDGEMENTNO
                        await UPDATE(VehicleOrderInspectionLines)
                            .set({ acknowledgementNo: resultApi.SerialNo, acknowledgementItcSentDate: new Date(), acknowledgementItcSentStatus: "S", acknowledgementItcResponse: JSON.stringify(responseAutoConfig) })
                            .where({ vehicleOrderInspectionLines: item.VEHICLEORDERINSPECTIONLINES })
                        await UPDATE(VehicleOrderInspections).set({ orderSyncedS4: false }).where({ serviceRequestNo: item.SERVICEREQUESTNO })

                        successPayload.push(item.SERVICEREQUESTNO);
                        responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, orderlineno: item.ORDERLINENO, isSynced: true, msg: "" }]);

                        //getting all applicable Characteristics commented as log string generation for DMS file creation has been rulled out for now // uncomment if it is needed in log string

                        /*let names = await cds.run(
                            `DO BEGIN
                            DECLARE APPLICABLECHARS NVARCHAR(5000);
                            CALL "GETAPPLICABLETESTNAMESPROCEDURE"('${item.VEHICLEORDERINSPECTIONLINES}', APPLICABLECHARS);
                            SELECT :APPLICABLECHARS AS LOG_STRING FROM DUMMY;
                            END`
                        );*/
                        /*
                        let names = await cds.db.run(`${ReturnConstants().cProcedures.cGetApplicableTestNamesProcedure} ('${item.VEHICLEORDERINSPECTIONLINES}', LOG_STRING => ?)`);
                        
                        logString = logString + "\nApplicable Characteristics are \n\n" + names.LOG_STRING.replace(/\\n/g, '\n');*/
                        //getting only 'ES_OUT','VI_VISUAL_TEST' Characteristics                       

                        /*let characteristicsResult = await cds.run(`
                                DO BEGIN
                                  DECLARE res TABLE (
                                    APPLICABLETESTNAME NVARCHAR(100),
                                    VEHICLEORDERINSPECTIONLINESTESTCHARUUID NVARCHAR(50)
                                  );
                                  CALL "GETESVISUALCHARACTERISTICSPROCEDURE"('${item.VEHICLEORDERINSPECTIONLINES}', res);
                                  SELECT * FROM :res;
                                END
                              `);*/
                        let characteristicsResult = await cds.db.run(`${ReturnConstants().cProcedures.cGeTesvisualCharacteristicsProcedure} ('${item.VEHICLEORDERINSPECTIONLINES}', OUT_RESULT => ?)`);
                        //characteristicsResult = characteristicsResult.changes[1];
                        characteristicsResult = characteristicsResult.OUT_RESULT;
                        if (characteristicsResult.length > 0) {
                            for (const itemcharacteristics of characteristicsResult) {

                                if (itemcharacteristics.APPLICABLETESTNAME == ReturnConstants().applicableNames.cVisualTest) {

                                    //getting only major issue

                                    /*let getMajorResult = await cds.run(`
                                            DO BEGIN
                                              DECLARE majorIssues TABLE (
                                                TESTMAINTYPENO NVARCHAR(20),
                                                TESTSUBTYPENO NVARCHAR(20),
                                                TESTSUBTYPETEXTARABIC NVARCHAR(255),
                                                TESTSUBTYPETEXTENGLISH NVARCHAR(255)
                                              );
                                              CALL "GETMAJORVISUALISSUESPROCEDURE"('${itemcharacteristics.VEHICLEORDERINSPECTIONLINESTESTCHARUUID}', majorIssues);
                                              SELECT * FROM :majorIssues;
                                            END
                                          `);
                                       
                                    getMajorResult = getMajorResult.changes[1];
                                    */
                                    let getMajorResult = await cds.db.run(`${ReturnConstants().cProcedures.cGetMajorVisualIssuesProcedure} ('${itemcharacteristics.VEHICLEORDERINSPECTIONLINESTESTCHARUUID}', OUT_RESULT => ?)`);
                                    getMajorResult = getMajorResult.OUT_RESULT;

                                    if (getMajorResult.length > 0) {
                                        logString = logString + ReturnConstants().cProcessLineItems.cMajorIssueDitected;
                                        for (const getMajorResultItem of getMajorResult) {
                                            console.log('major = ', itemcharacteristics.VEHICLEORDERINSPECTIONLINESTESTCHARUUID);
                                            let category = getMajorResultItem.TESTMAINTYPENO;
                                            let subcategory = getMajorResultItem.TESTSUBTYPENO;

                                            var visual = await cds.run(SELECT.one.from(TestResultsVisual).where({ vehicleOrderInspectionLinesTestChar: itemcharacteristics.VEHICLEORDERINSPECTIONLINESTESTCHARUUID }));


                                            var comment = await cds.run(SELECT.one.from(TestResultsVisualDetail).where({ testResultsVisualDetail: visual.testResultsVisualUUID }));



                                            let subShort = String(subcategory).replace(String(category), '');
                                            let testCode = `${category}-${subShort}`;
                                            logString = logString + ReturnConstants().cProcessLineItems.cMajorIssueFound + testCode + "\n";

                                            // Prepare error payload for visual test failure
                                            var errorPayload = {
                                                "Header": {
                                                    "sourceApp": ReturnConstants().aknowledgementApiConstants.cPayloadSourceApp,
                                                    "btpApp": ReturnConstants().itcConstants.cBtpApp,
                                                    "transactionId": cds.utils.uuid()
                                                },
                                                "insertFailureCauseRequest": {
                                                    "request": {
                                                        "ReferenceNo": parseInt(serviceRequestNo),
                                                        //"ReferenceNo": parseInt(item.ORDERLINENO),
                                                        "InspectionCenterCode": parseInt(plantItcCode.PLANT_ITC_CODE),
                                                        "SerialNo": parseInt(resultApi.SerialNo),
                                                        "TestCode": testCode,
                                                        "TestArabicDesc": getMajorResultItem.TESTSUBTYPETEXTARABIC.replace(/\n/g, '') || '--',
                                                        "TestEnglishDesc": getMajorResultItem.TESTSUBTYPETEXTENGLISH.replace(/\n/g, '') || '--',
                                                        "TestComments": comment.Remarks || "",//need to dynamic
                                                        "UserID": ReturnConstants().aknowledgementApiConstants.cPayloadUserID,
                                                        "SystemCode": ReturnConstants().aknowledgementApiConstants.cPayloadSystemCode
                                                    }
                                                }
                                            };
                                            //call the destination with error payload
                                            const responseFailure = await cs4Destination.post(ReturnConstants().aknowledgementApiConstants.cFailureApiDesinationPath, errorPayload);
                                            logString = logString + ReturnConstants().cProcessLineItems.cForPayload + JSON.stringify(errorPayload) + ReturnConstants().cProcessLineItems.cResponse + JSON.stringify(responseFailure);

                                            //if status is FAILED
                                            if (responseFailure.insertFailureCauseResponse.responseStatus.statusMsg == ReturnConstants().cProcessLineItems.cItemFailedText) {
                                                logString = logString + "\n " + ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + JSON.stringify(responseFailure.insertFailureCauseResponse.insertFailureCauseResponse.insertFailureCauseErrorHeader) + " \n";
                                                errorlog.push({
                                                    documentRefNo: item.SERVICEREQUESTNO,
                                                    errorResponse: ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + JSON.stringify(responseFailure.insertFailureCauseResponse.insertFailureCauseResponse.insertFailureCauseErrorHeader),
                                                    reqPayload: JSON.stringify(errorPayload),
                                                    module: ReturnConstants().aknowledgementApiConstants.cErrorModule,
                                                    endPoint: ReturnConstants().aknowledgementApiConstants.cErrorEndPoint,
                                                    methodCalled: ReturnConstants().aknowledgementApiConstants.cMethodCalled
                                                });
                                            }
                                        }
                                        logString = logString + ReturnConstants().cProcessLineItems.cVisualTestCompleted;
                                    } else {
                                        logString = logString + ReturnConstants().cProcessLineItems.cNoMajorIsseu;
                                    }
                                }
                                if (itemcharacteristics.APPLICABLETESTNAME == ReturnConstants().cProcessLineItems.cEsOutText) {
                                    //getting only failed MAHA result                                    
                                    /*let mahaOutResult = await cds.run(`
                                            DO BEGIN
                                              DECLARE outMahaResult TABLE (
                                                MAHACODEKEY NVARCHAR(10),
                                                MAHALABELARABIC NVARCHAR(255),
                                                MAHALABELENGLISH NVARCHAR(255)
                                              );
                                              CALL "GETMAHAOUTRESULTCODESPROCEDURE"('${itemcharacteristics.VEHICLEORDERINSPECTIONLINESTESTCHARUUID}', outMahaResult);
                                              SELECT * FROM :outMahaResult;
                                            END
                                          `);
                                    
                                    mahaOutResult = mahaOutResult.changes[1];*/
                                    let mahaOutResult = await cds.db.run(`${ReturnConstants().cProcedures.cGetMahaoutResultCodesProcedure} ('${itemcharacteristics.VEHICLEORDERINSPECTIONLINESTESTCHARUUID}', OUT_RESULT => ?)`);
                                    mahaOutResult = mahaOutResult.OUT_RESULT;

                                    var errorFailureResponce = [];
                                    if (mahaOutResult.length > 0) {
                                        logString = logString + ReturnConstants().cProcessLineItems.cMahaDetected;
                                        for (const mahaOutResultItem of mahaOutResult) {
                                            logString = logString + ReturnConstants().cProcessLineItems.cMahaFailedForTest + mahaOutResultItem.MAHACODEKEY + "\n";

                                            //error payload creation
                                            var errorPayload = {
                                                "Header": {
                                                    "sourceApp": ReturnConstants().aknowledgementApiConstants.cPayloadSourceApp,
                                                    "btpApp": ReturnConstants().itcConstants.cBtpApp,
                                                    "transactionId": cds.utils.uuid()
                                                },
                                                "insertFailureCauseRequest": {
                                                    "request": {
                                                        "ReferenceNo": parseInt(serviceRequestNo),
                                                        //"ReferenceNo": parseInt(item.ORDERLINENO),
                                                        "InspectionCenterCode": parseInt(plantItcCode.PLANT_ITC_CODE),
                                                        "SerialNo": parseInt(resultApi.SerialNo),
                                                        "TestCode": mahaOutResultItem.MAHACODEKEY,
                                                        "TestArabicDesc": mahaOutResultItem.MAHALABELARABIC.replace(/\n/g, '') || '--',
                                                        "TestEnglishDesc": mahaOutResultItem.MAHALABELENGLISH.replace(/\n/g, '') || '--',
                                                        "TestComments": "",
                                                        "UserID": ReturnConstants().aknowledgementApiConstants.cPayloadUserID,
                                                        "SystemCode": ReturnConstants().aknowledgementApiConstants.cPayloadSystemCode
                                                    }
                                                }
                                            };
                                            //call the destination with error payload
                                            const responseFailure = await cs4Destination.post(ReturnConstants().aknowledgementApiConstants.cFailureApiDesinationPath, errorPayload);
                                            logString = logString + ReturnConstants().cProcessLineItems.cForPayload + JSON.stringify(errorPayload) + ReturnConstants().cProcessLineItems.cResponse + JSON.stringify(responseFailure);
                                            if (responseFailure.insertFailureCauseResponse.responseStatus.statusMsg == ReturnConstants().cProcessLineItems.cItemFailedText) {
                                                logString = logString + "\n " + ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + JSON.stringify(responseFailure.insertFailureCauseResponse.insertFailureCauseResponse.insertFailureCauseErrorHeader) + " \n";

                                                errorlog.push({
                                                    documentRefNo: item.SERVICEREQUESTNO,
                                                    errorResponse: ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + JSON.stringify(responseFailure.insertFailureCauseResponse.insertFailureCauseResponse.insertFailureCauseErrorHeader),
                                                    reqPayload: JSON.stringify(errorPayload),
                                                    module: ReturnConstants().aknowledgementApiConstants.cErrorModule,
                                                    endPoint: ReturnConstants().aknowledgementApiConstants.cErrorEndPoint,
                                                    methodCalled: ReturnConstants().aknowledgementApiConstants.cMethodCalled
                                                });

                                            }
                                        }
                                        logString = logString + ReturnConstants().cProcessLineItems.cMahaFailureApiCalled;
                                    }

                                }
                            }
                        }
                        else {
                            logString = logString + ReturnConstants().cProcessLineItems.cNoVisualMaha;
                        }
                    }
                    else {

                        logString = logString + ReturnConstants().cProcessLineItems.cForPlateNumber + item.PLATENUMBER + ReturnConstants().cProcessLineItems.cSrReqNumber + item.SERVICEREQUESTNO + ReturnConstants().cProcessLineItems.cNoAckRec;
                        logString = logString + ReturnConstants().cProcessLineItems.cForPayload + JSON.stringify(payload) + " \n";

                        logString = logString + ReturnConstants().cProcessLineItems.cErorsAre + JSON.stringify(responseAutoConfig.setInspectionResultResponse.setInspectionResultResponse) + '\n';
                        errors.push({ [item.SERVICEREQUESTNO]: responseAutoConfig.setInspectionResultResponse.setInspectionResultResponse });
                        responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, orderlineno: item.ORDERLINENO, isSynced: false, msg: responseAutoConfig.setInspectionResultResponse.setInspectionResultResponse }]);
                        errorlog.push({
                            documentRefNo: item.SERVICEREQUESTNO,
                            errorResponse: ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + JSON.stringify(responseAutoConfig),
                            reqPayload: JSON.stringify(payload),
                            module: ReturnConstants().aknowledgementApiConstants.cErrorModule,
                            endPoint: ReturnConstants().aknowledgementApiConstants.cErrorEndPoint,
                            methodCalled: ReturnConstants().aknowledgementApiConstants.cMethodCalled
                        });
                        await UPDATE(VehicleOrderInspectionLines)
                            .set({ acknowledgementItcSentDate: new Date(), acknowledgementItcSentStatus: "F", acknowledgementItcResponse: JSON.stringify(responseAutoConfig) })
                            .where({ vehicleOrderInspectionLines: item.VEHICLEORDERINSPECTIONLINES })
                    }
                } catch (error) {
                    logString = logString + '\n ' + error + '\n';
                    logString = logString + ReturnConstants().cProcessLineItems.cPayloadSent + JSON.stringify(payload) + '\n';
                    if (error) {
                        errors.push({ [item.SERVICEREQUESTNO]: error });
                        responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, orderlineno: item.ORDERLINENO, isSynced: false, msg: error }]);
                    }
                }
            } else {
                //when validation of payload is false

                logString = logString + "\n " + validatePayload + ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + "\n";
                logString = logString + ReturnConstants().cProcessLineItems.cPayloadSent + JSON.stringify(payload) + '\n';
                //should store the data in other array to recify the problem??
                errors.push({ [item.SERVICEREQUESTNO]: ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + validatePayload });
                responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, orderlineno: item.ORDERLINENO, isSynced: false, msg: ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + validatePayload }]);
                errorlog.push({
                    documentRefNo: item.SERVICEREQUESTNO,
                    errorResponse: ReturnConstants().cProcessLineItems.cForMaterialCode + item.MATERIALCODE + ReturnConstants().cProcessLineItems.cForMaterialName + item.MATERIALNAME + ReturnConstants().cProcessLineItems.cErorsAre + validatePayload,
                    reqPayload: JSON.stringify(payload),
                    module: ReturnConstants().aknowledgementApiConstants.cErrorModule,
                    endPoint: ReturnConstants().aknowledgementApiConstants.cErrorEndPoint,
                    methodCalled: ReturnConstants().aknowledgementApiConstants.cMethodCalled
                });
            }
            //end of one record in loop
            logString = logString + '\n ------------------------- \n';
        }
        if (errorlog.length > 0) {
            logString = logString + ReturnConstants().cProcessLineItems.cDbInsert;
            await INSERT.into(ErrorLogs).entries(errorlog);
        }

        logString = logString + ReturnConstants().cProcessLineItems.cDmsFileEntry;

        //creation of log file on DMS
        //await createFileOnDMSFunc(logString);
        /*return {
            message: ReturnConstants().cProcessLineItems.cProcessCompleted,
            success: successPayload.join(', '),
            fail: errors
        }*/
        return responseOrders

    }
    service.on('processLineItemsForAcknowledgement', async (req) => {
        return await processLineItemsForAcknowledgementFunc();
    })


    /******************************************************************************
     * Fcreate logfile for DMS
    /*****************************************************************************/

    async function createFileOnDMSFunc(logString) {
        let textFileName = ReturnConstants().aknowledgementDMSFile.cFilename + new Date().toISOString() + ".txt";
        let orgFileName = ReturnConstants().aknowledgementDMSFile.cFilename + new Date().toISOString();
        logString = logString + ReturnConstants().Notification.logFileNameString + textFileName + '\n';
        logString = logString + '\n****************************' + ReturnConstants().cGeneralError.cExectionCompletedAt + getCurrentDateTimeString() + '****************************\n';
        //create new file
        let newFilePaylodForDMS = {
            "Files": [
                {
                    "attachmentGuId": null,
                    "attachmentName": textFileName,
                    "orgFileName": orgFileName,
                    "orgFileExtension": "txt",
                    "docType": null,
                    "docId": null,
                    "docGuid": null,
                    "base64File": Buffer.from(logString).toString('base64')
                }
            ]
        };
        let responceDMS = await uploadAttachmentInDMSFunc(newFilePaylodForDMS);
        console.log(logString);
    }

    /******************************************************************************
       * Function to update master data in BTP , from S4 Hana
    /*****************************************************************************/

    /******************************************************************************
     * Function to update all vehicle masters from a single function
  /*****************************************************************************/

    /***********************************************************
        *  Change vehicle info - MAHA_ESIN File generation..
    ***********************************************************/

    service.after('UPDATE', 'VehicleOrderInspectionLinesTestChar', async (req) => {

        let sTestCharUUID = req.VehicleOrderInspectionLinesTestCharUUID;
        let sApplicableTestName = req.applicableTestName;
        let sTestStatus = req.testStatus;

        let oTestCharResponse = await SELECT.one.from(VehicleOrderInspectionLinesTestChar).where({ VehicleOrderInspectionLinesTestCharUUID: sTestCharUUID });
        if (!oTestCharResponse) {
            return;
        }
        // Check applicable test name is Change vehicle info
        if (sApplicableTestName == ReturnConstants().testType.cChangeVehicleInfo) {
            if (sTestStatus == ReturnConstants().testStatus.cCompleted) {

                // Query to get all header lines data based on testCharUUID
                const oQuery = SELECT.from(VehicleOrderInspections)
                    .columns(a => {
                        a('*');
                        a.VehOrdInspDetails(b => {
                            b('*');
                            b.VehicleDetails('*');
                            b.vehOrdInspLines(l => {
                                l('*');
                                l.vehOrdInspLinesTestChars('*');
                            });
                        });
                    })
                    .where({
                        'VehOrdInspDetails.vehOrdInspLines.vehOrdInspLinesTestChars.VehicleOrderInspectionLinesTestCharUUID': sTestCharUUID
                    });

                // Execute Query
                const oDataResult = await cds.tx(async tx => await tx.run(oQuery));

                if (!oDataResult.length > 0) {
                    return;
                }

                let oResTestChar = oDataResult[0];

                let sServiceRequestNo = oResTestChar.serviceRequestNo;
                let sPlantCode = oResTestChar.plantCode;
                let sEsInTestUUID;

                let aMatchingLines = oResTestChar.VehOrdInspDetails
                    .flatMap(detail => detail.vehOrdInspLines)
                    .filter(line =>
                        line.vehOrdInspLinesTestChars.some(
                            item => item.VehicleOrderInspectionLinesTestCharUUID === sTestCharUUID
                        )
                    );


                let sOrderLineNumber = aMatchingLines[0].orderLineNo;
                let sVehDetailUUID = aMatchingLines[0].vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID;

                // Get vehicle details
                const oQueryVeh = SELECT.from(VehicleOrderInspectionDetails)
                    .columns(a => {
                        a('*');
                        a.VehicleDetails(b => {
                            b('*');
                        });
                    }).where({ vehicleOrderInspectionDetailsUUID: sVehDetailUUID })

                let aVehResult = await cds.tx(async tx => await tx.run(oQueryVeh));
                let oChangeVehicleMasterData = aVehResult[0].VehicleDetails;

                if (oChangeVehicleMasterData.registrationDate) {
                    let dRegistrationDate = oChangeVehicleMasterData.registrationDate.substring(0, 10).replace(/-/g, '');
                    oChangeVehicleMasterData.registrationDate = dRegistrationDate;
                } else {
                    oChangeVehicleMasterData.registrationDate = ''; // or null, depending on your needs
                }

                // Get ESIN testchar level
                let atestCharEsIn = aMatchingLines[0].vehOrdInspLinesTestChars.find(char => char.applicableTestName === ReturnConstants().testType.cESIN);
                sEsInTestUUID = atestCharEsIn ? atestCharEsIn.VehicleOrderInspectionLinesTestCharUUID : null;

                if (!atestCharEsIn) {
                    return;
                }

                // Get ESOUT test char level
                let atestCharEsOut = aMatchingLines[0].vehOrdInspLinesTestChars.find(char => char.applicableTestName === ReturnConstants().testType.cESOUT);
                if (!atestCharEsOut) {
                    return;
                }

                // If ES_OUT result has been  saved into table then no need to generate ES_IN file
                if (atestCharEsOut.testStatus == ReturnConstants().testStatus.cPass || atestCharEsOut.testStatus == ReturnConstants().testStatus.cFail) {
                    return;
                }
                else {
                    let aListFreshTestMahaCode = await SELECT.from(MahaConfigurations)
                        .where({ mahaType: ReturnConstants().testType.cESIN })
                        .orderBy({ sequenceNumber: ReturnConstants().maha.cASC });

                    let sEsInFileName = `${sPlantCode}_${sServiceRequestNo}_${sOrderLineNumber}.${ReturnConstants().maha.fileExtTxt}`;
                    let sContent = "";
                    // Loop through each mapping definition
                    for (let item of aListFreshTestMahaCode) {
                        let { fieldSourceTable, fieldSourceName, mahaFieldCode, fieldSourceValue } = item;
                        let value = "";

                        try {
                            // 🔹 Case 1: Vehicle Master Table → pull directly from in-memory object
                            if (fieldSourceTable === ReturnConstants().maha.vehicleMasterTable) {
                                if (oChangeVehicleMasterData.hasOwnProperty(fieldSourceName)) {
                                    value = oChangeVehicleMasterData[fieldSourceName] ?? "";
                                    if (value === ReturnConstants().maha.valueNA || value === null || value === undefined) {
                                        value = "";
                                    }
                                    sContent += `${mahaFieldCode}=${value}\r\n`;
                                }
                            }
                            // Special rule for default table when mahaFieldCode is empty
                            if ((!mahaFieldCode || mahaFieldCode.trim() === "")
                                && fieldSourceTable === ReturnConstants().maha.default) {
                                value = fieldSourceValue;
                                sContent += `${value}\r\n`;
                            }
                            else if (fieldSourceTable === ReturnConstants().maha.default) {
                                value = fieldSourceValue;
                                sContent += `${mahaFieldCode}=${value}\r\n`;

                            }
                        } catch (err) {
                            throw req.error('ERRORMAHAFIELDTABLE' + err.message);
                        }
                    }

                    const buffer = Buffer.from(sContent, 'utf-8');
                    let sBase64Content = buffer.toString(ReturnConstants().maha.cBase64);

                    let oMahaEsInPayload = {
                        Site_no: sPlantCode,
                        File_name: sEsInFileName,
                        File_Content: sBase64Content,
                        fileUploadPath: "",
                        btpApp: ReturnConstants().itcConstants.cBtpApp
                    };

                    const oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
                    let aResMahaEsIn = await oConnectionPost.post(ReturnConstants().destinationCLM.cSapBtpToMahaEsIn, oMahaEsInPayload);

                    let sResponseMessage = aResMahaEsIn.responseStatus.statusMsg;

                    if (sResponseMessage == ReturnConstants().apiResponse.cSuccess) {
                        let oResUpdateTestChar = await UPDATE('VehicleOrderInspectionLinesTestChar')
                            .set({
                                testStatus: ReturnConstants().testStatus.cCompleted,
                                testComments: ReturnConstants().testAdditionalInfo.cComment,
                                testInspectedBy: ReturnConstants().testAdditionalInfo.cInspector,
                                testInspectionStartDate: new Date(),
                                testInspectionEndDate: new Date()
                            })
                            .where({ VehicleOrderInspectionLinesTestCharUUID: sTestCharUUID });

                        let oESINDetailResPayload = {
                            vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sEsInTestUUID,
                            Type: ReturnConstants().testType.cESIN,
                            startDate: new Date(),
                            completedDate: new Date(),
                            attachmentData: sBase64Content,
                            attachmentName: sEsInFileName,
                            inUse: true
                        }

                        // let oMahaFileResponse = await SELECT.one.from(testResMahaInDtl).where({ vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sEsInTestUUID });
                        let oMahaFileResponse = await SELECT.one.from(testResMahaInDtl)
                            .where({ vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sEsInTestUUID })
                            .orderBy({ createdAt: ReturnConstants().maha.cDESC });

                        let sInsertTestResMaha = await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                        if (oMahaFileResponse) {
                            // Update previous ESIN inUse to false
                            let oResUpdateMahaResFile = await UPDATE(testResMahaInDtl)
                                .set({ inUse: false })
                                .where({ testResMahaFileDtlUUID: oMahaFileResponse.testResMahaFileDtlUUID });

                        }
                    }
                    else { // If es_in give error then insert into this
                        let sResponseMessage = aResMahaEsIn.responseStatus.errorDetails[0].message;
                        let oESINDetailResPayload = {
                            vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sEsInTestUUID,
                            Type: ReturnConstants().testType.cESIN,
                            startDate: new Date(),
                            attachmentData: sBase64Content,
                            attachmentName: sEsInFileName,
                            inUse: true,
                            isError: true,
                            errorDesc: sResponseMessage
                        };

                        await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                    }
                }

            }
        }

    });

    /***********************************************************
         *  Method to MAHA_ESOUT ES-Out Service 
    ***********************************************************/
    service.on('ESOutService', async (req) => {

        // Step 1: siteCode validation
        if (!req.data.siteCode || req.data.siteCode.trim() === "") {
            req._.res.status(400);
            return { error: 'MISSINGSITECODE' };
        }
        // Step 2: fileName validation
        if (!req.data.fileName || req.data.fileName.trim() === "") {
            req._.res.status(400);
            return { error: 'MISSINGFILENAME' };
        }

        // Step 3: base64Data validation
        if (!req.data.base64Data || req.data.base64Data.trim() === "") {
            req._.res.status(400);
            return { error: 'MISSINGBASE64DATA' };
        }

        let { fileName, base64Data } = req.data;
        let aFileParts = fileName.split("_");
        let sPlantCode = aFileParts[0];
        let iServiceRequestNo = aFileParts[1];
        let iOrderLineNo = parseInt(aFileParts[2].split(".")[0], 10);

        let oQuery = SELECT.from(VehicleOrderInspections)
            .columns(a => {
                a('*');
                a.VehOrdInspDetails(b => {
                    b('*');
                    b.vehOrdInspLines(l => {
                        l('*')
                        l.vehOrdInspLinesTestChars(c => {
                            c('*');
                        }).where({ applicableTestName: { in: [ReturnConstants().testType.cESIN, ReturnConstants().testType.cESOUT] } });
                    }).where({ orderLineNo: iOrderLineNo });
                });
            })
            .where({ serviceRequestNo: iServiceRequestNo });

        let aOrderResult = await cds.tx(async tx => await tx.run(oQuery));

        // FOR OVERALL STATUS
        let oQueryOverallStatus = SELECT.from(VehicleOrderInspections)
            .columns(a => {
                a('*');
                a.VehOrdInspDetails(b => {
                    b('*');
                    b.vehOrdInspLines(l => {
                        l('*')
                        l.vehOrdInspLinesTestChars(c => {
                            c('*');
                        })
                    }).where({ orderLineNo: iOrderLineNo });
                });
            })
            .where({ serviceRequestNo: iServiceRequestNo });

        let aOrderResultOverAll = await cds.tx(async tx => await tx.run(oQueryOverallStatus));

        let aOrderLineDataOverall = aOrderResultOverAll[0].VehOrdInspDetails
            .flatMap(detail => detail.vehOrdInspLines)
            .filter(line => line.orderLineNo === iOrderLineNo);

        let sTestCharForOverAll = aOrderLineDataOverall[0].vehOrdInspLinesTestChars;

        const aFilteredTestChar = sTestCharForOverAll.map(item => ({
            testStatus: item.testStatus,
            applicableTestName: item.applicableTestName
        }));

        let lMainService = [
            { applicableTestName: ReturnConstants().applicableNames.cEsIn },
            { applicableTestName: ReturnConstants().applicableNames.cVisualTest },
            { applicableTestName: ReturnConstants().applicableNames.cPermitTest },
            { applicableTestName: ReturnConstants().applicableNames.cEsmaTest },
            { applicableTestName: ReturnConstants().applicableNames.cTrafficTest },
            { applicableTestName: ReturnConstants().applicableNames.cComprehensiveTest },
            { applicableTestName: ReturnConstants().applicableNames.cModifiedTest }];

        let oFinalPayloadOverAllStatus = { "Payload": [] };

        if (aFilteredTestChar.length > 0) {
            lMainService.forEach(Item => {

                const sApplicableTestName = Item.applicableTestName;

                // Find matching object from aFilteredTestChar
                const matched = aFilteredTestChar.find(
                    x => x.applicableTestName === sApplicableTestName
                );

                const data = {
                    applicableTestName: sApplicableTestName,
                    Status: matched ? matched.testStatus : "NA"
                };

                oFinalPayloadOverAllStatus.Payload.push(data);
            });
        }

        // Validation to check serviceReqNo is exits or not
        if (aOrderResult.length == 0) {
            req._.res.status(500);
            return {
                responseStatus: {
                    statusCode: "0",
                    statusMsg: ReturnConstants().maha.EsOutMessage.serviceReqNoMsg
                },
                responseData: {
                    FileName: fileName
                }
            };
        }

        let aOrderLineData = aOrderResult[0].VehOrdInspDetails
            .flatMap(detail => detail.vehOrdInspLines)
            .filter(line => line.orderLineNo === iOrderLineNo);

        let sTestCharsData = aOrderLineData[0].vehOrdInspLinesTestChars;

        let oEsInObject = sTestCharsData?.filter(char =>
            char.applicableTestName === ReturnConstants().testType.cESIN
        ) || [];

        let hasES_INCompleted = false;
        if (oEsInObject[0].testStatus == ReturnConstants().testStatus.cCompleted) {
            hasES_INCompleted = true;
        }

        let oEsOutObject = sTestCharsData?.filter(char =>
            char.applicableTestName === ReturnConstants().testType.cESOUT
        ) || [];

        //Check ESOUT processed or not
        if (oEsOutObject[0].testStatus === ReturnConstants().testStatus.cFail || oEsOutObject[0].testStatus === ReturnConstants().testStatus.cPass) {
            req._.res.status(500);
            return {
                responseStatus: {
                    statusCode: "0",
                    statusMsg: ReturnConstants().maha.EsOutMessage.alreadyProcessed
                },
                responseData: {
                    FileName: fileName
                }
            };
        }

        let sEsOutTestCharUUID = oEsOutObject[0]?.VehicleOrderInspectionLinesTestCharUUID;

        // Check weather ES_IN hase completed or not
        if (hasES_INCompleted) {

            let sMahaOutFileDtlUUID = cds.utils.uuid();
            let oESOUTDetailResPayload = {
                testResMahaOutFileDtlUUID: sMahaOutFileDtlUUID,
                vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sEsOutTestCharUUID,
                startDate: new Date(),
                completedDate: new Date(),
                attachmentData: base64Data,
                attachmentName: fileName
            };

            await INSERT.into(testResMahaOutDtl).entries(oESOUTDetailResPayload);

            try {
                const buffer = Buffer.from(base64Data, ReturnConstants().maha.cBase64);
                const decodedText = buffer.toString('utf-8');

                const keyValueArray = [];
                let currentSection = null;

                const lines = decodedText.split(/\r?\n/);
                for (const line of lines) {
                    if (line.trim() === '' || line.trim().startsWith(';')) continue;

                    if (line.startsWith('[') && line.endsWith(']')) {
                        currentSection = line.substring(1, line.length - 1);
                        continue;
                    }

                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        keyValueArray.push({ key, value });
                    }
                }

                let aListMahaConfigCode = await SELECT.from(MahaConfigurations).where({ mahaType: ReturnConstants().testType.cESOUT });
                let aListMahaOut = [];
                let sMahaStatus;

                for (let config of aListMahaConfigCode) {

                    // for code serviceRequestNo -1
                    if (config.mahaFieldCode == ReturnConstants().maha.cCodeServiceReqNo) {
                        aListMahaOut.push({
                            testResultMahaOutUUID: cds.utils.uuid(),
                            testResMahaOutDtl_testResMahaOutFileDtlUUID: sMahaOutFileDtlUUID,
                            mahaLabelEnglish: config.sapCodeDesc || config.fieldSourceName || '',
                            mahaLabelArabic: '',
                            mahaCodeKey: config.mahaFieldCode,
                            mahaCodeValue: iServiceRequestNo,
                            rowType: ''
                        });
                        continue;
                    }
                    // for code orderLineNumber -2
                    if (config.mahaFieldCode == ReturnConstants().maha.cCodeOrderLineNo) {
                        aListMahaOut.push({
                            testResultMahaOutUUID: cds.utils.uuid(),
                            testResMahaOutDtl_testResMahaOutFileDtlUUID: sMahaOutFileDtlUUID,
                            mahaLabelEnglish: config.sapCodeDesc || config.fieldSourceName || '',
                            mahaLabelArabic: '',
                            mahaCodeKey: config.mahaFieldCode,
                            mahaCodeValue: iOrderLineNo,
                            rowType: ''
                        });
                        continue;
                    }
                    // for code PlantCode -3
                    if (config.mahaFieldCode == ReturnConstants().maha.cCodePlantCode) {
                        aListMahaOut.push({
                            testResultMahaOutUUID: cds.utils.uuid(),
                            testResMahaOutDtl_testResMahaOutFileDtlUUID: sMahaOutFileDtlUUID,
                            mahaLabelEnglish: config.sapCodeDesc || config.fieldSourceName || '',
                            mahaLabelArabic: '',
                            mahaCodeKey: config.mahaFieldCode,
                            mahaCodeValue: sPlantCode,
                            rowType: ''
                        });
                        continue;
                    }

                    let oMatchedKeyValue = keyValueArray.find(kv => kv.key === config.mahaFieldCode);

                    if (oMatchedKeyValue && oMatchedKeyValue.key === ReturnConstants().maha.cOverAllResult) {
                        if (oMatchedKeyValue.value === ReturnConstants().maha.mahaPassCodeSeven || oMatchedKeyValue.value === ReturnConstants().maha.mahaPassCodeOne) {
                            sMahaStatus = ReturnConstants().testStatus.cPass;
                        } else {
                            sMahaStatus = ReturnConstants().testStatus.cFail;
                        }
                    }

                    if (oMatchedKeyValue) {
                        aListMahaOut.push({
                            testResultMahaOutUUID: cds.utils.uuid(),
                            testResMahaOutDtl_testResMahaOutFileDtlUUID: sMahaOutFileDtlUUID,
                            mahaLabelEnglish: config.sapCodeDesc || config.fieldSourceName || '',
                            mahaLabelArabic: '',
                            mahaCodeKey: oMatchedKeyValue.key,
                            mahaCodeValue: oMatchedKeyValue.value,
                            rowType: ''
                        });
                    }
                }

                await cds.run(INSERT.into(testMahaOutResult).entries(aListMahaOut));

                await UPDATE('VehicleOrderInspectionLinesTestChar')
                    .set({
                        testStatus: sMahaStatus,
                        testComments: ReturnConstants().testAdditionalInfo.cComment,
                        testInspectedBy: ReturnConstants().testAdditionalInfo.cInspector,
                        testInspectionStartDate: new Date(),
                        testInspectionEndDate: new Date()
                    })
                    .where({ VehicleOrderInspectionLinesTestCharUUID: sEsOutTestCharUUID });

                req._.res.status(200);
                // update overall status in case of ES_OUT 
                try {
                    let oEsOut = {
                        testStatus: sMahaStatus,
                        applicableTestName: ReturnConstants().testType.cESOUT
                    }
                    oFinalPayloadOverAllStatus.Payload.push(oEsOut);
                    const resultForOverAllStatus = await _callOverAllStatusProcedure(oFinalPayloadOverAllStatus);

                    if (resultForOverAllStatus.length > 0) {
                        const Result = await cds.run(UPDATE(VehicleOrderInspectionLines)
                            .set({
                                overallTestStatus: resultForOverAllStatus[0].OVERALLFINALTESTSTATUS
                            })
                            .where({ vehicleOrderInspectionLines: aOrderLineData[0].vehicleOrderInspectionLines }));
                    }
                } catch (error) {
                    throw req.error('ERRORONSYNCVEHICLEDATA' + error.message);
                }

                return {
                    responseStatus: {
                        statusCode: "0",
                        statusMsg: ReturnConstants().apiResponse.cSuccess
                    },
                    responseData: {
                        FileName: fileName
                    }
                };

            } catch (err) {
                req._.res.status(500);
                return {
                    responseStatus: {
                        statusCode: "0",
                        statusMsg: err.message
                    },
                    responseData: {
                        FileName: fileName
                    }
                };
            }
        }
        else {
            req._.res.status(500);
            return {
                responseStatus: {
                    statusCode: "0",
                    statusMsg: ReturnConstants().maha.EsOutMessage.ES_INMSG
                },
                responseData: {
                    FileName: fileName
                }
            };
        }
    });

    /***********************************************************
         *  Method to Add shift Details for next 30 days 
    ***********************************************************/

    service.on('addShiftDetails', async (req) => {

        let getLastDetailResult = await cds.run(SELECT.from(Shifts).columns(
            ReturnConstants().cShiftDetails.cColumn
        ).orderBy(ReturnConstants().cShiftDetails.cOrderBy).limit(1));
        const startDate = new Date(getLastDetailResult[0].shiftToDate);

        const limitDates = ReturnConstants().cShiftDetails.cLimitDays;
        for (let i = 1; i <= limitDates; i++) {
            const nextDate = new Date(startDate);
            nextDate.setDate(startDate.getDate() + i);

            // Format date as yyyy-mm-dd
            const year = nextDate.getFullYear();
            const month = String(nextDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(nextDate.getDate()).padStart(2, '0');
            var newdate = `${year}-${month}-${day}`;
            var objShifts = {
                UUID: cds.utils.uuid(),
                siteNumber: ReturnConstants().cShiftDetails.cSiteNumber,
                businessDate: newdate,
                shiftDetail: 3,
                eventType: 1,
                shiftFromDate: newdate,
                shiftFromTime: ReturnConstants().cShiftDetails.cShiftFromTime,
                shiftToDate: newdate,
                shiftToTime: ReturnConstants().cShiftDetails.shiftToTime,
                runningShiftNumber: 1,
                runningBusinessDate: newdate
            };
            await INSERT.into(Shifts).entries(objShifts);
        }
        return 'RETURNSTRING';
    });


    /******************************************************************************
      * Get Loyalty Details from comarch through CPI
     /*****************************************************************************/
    service.on("fetchLoyaltyDetails", async (req) => {

        var oParameters = {
            "input": {
                "loyaltyIdentifier": req.data.input,
                "btpApp": ReturnConstants().itcConstants.cBtpApp
            }
        };
        try {

            var oConnectionPost = await cds.connect.to(ReturnConstants().destinationCPI.cDestination);
            var oLoyaltyResult = await oConnectionPost.post(ReturnConstants().destinationCPI.cGetLoyalty, oParameters)

            return oLoyaltyResult;

        } catch (errobj) {
            req.error(errobj.message);
        }
    });

    /******************************************************************************
      * Post Loyalty Details in Comarch through CPI
     /*****************************************************************************/
    service.on("fetchInputDetails", async (req) => {
        let oSrvResp;

        var { Payload, loyaltyID, simulation } = req.data

        if (!simulation) {
            Payload.trnNo = uuid();
        }

        var oHeader = {
            "simulate": simulation.toString(),
            "loyaltyIdentifier": loyaltyID,
            "Content-Type": "application/json",
            "btpApp": ReturnConstants().itcConstants.cBtpApp
        };

        var oConnectionPost = await cds.connect.to(ReturnConstants().destinationCPI.cDestination);
        try {

            oSrvResp = await oConnectionPost.send({
                query: ReturnConstants().destinationCPI.cPostLoyalty,
                data: Payload,
                headers: oHeader
            });

            return oSrvResp;
        }
        catch (errobj) {
            req.error(errobj.message);
        }
    });


    /******************************************************************************
     * On characteristic update event, update the start date and end date of the test in the VehicleOrderInspectionLine.
    /*****************************************************************************/
    service.after('UPDATE', 'VehicleOrderInspectionLinesTestChar', async (req) => {

        const { VehicleOrderInspectionLinesTestCharUUID, testResultsESMAS, testResultsTraffics, testResComps, testResultsPermits, testResultsVisuals, testResMahaOutFileDtls } = req;
        let bApplicableTestFlag = false;
        // Determine which test result was updated
        if (testResultsESMAS) {
            bApplicableTestFlag = true
        } else if (testResultsTraffics) {
            bApplicableTestFlag = true
        } else if (testResComps) {
            bApplicableTestFlag = true
        } else if (testResultsPermits) {
            bApplicableTestFlag = true
        } else if (testResultsVisuals) {
            bApplicableTestFlag = true
        } else if (testResMahaOutFileDtls) {
            bApplicableTestFlag = true
        } else {
            bApplicableTestFlag = false;
        }
        if (bApplicableTestFlag = true) {
            let oData = await updateOrderLineItemStartAndEndDate(VehicleOrderInspectionLinesTestCharUUID);
        }
    });

    /******************************************************************************
    * On characteristic update event, update the start date and end date of the test in the VehicleOrderInspectionLine.
   /*****************************************************************************/
    async function updateOrderLineItemStartAndEndDate(VehicleOrderInspectionLinesTestCharUUID) {
        try {
            let dOverAllTestStartDate = null;
            let dOverALllTestEndDate = null;
            let sLineGuid = null;

            //#region  Fetch TestChar Data for get line guid 
            const oResultchar = await SELECT.one.from(VehicleOrderInspectionLinesTestChar).where({ VehicleOrderInspectionLinesTestCharUUID: VehicleOrderInspectionLinesTestCharUUID });
            if (oResultchar) {
                sLineGuid = oResultchar.vehicleOrderInspectionLines_vehicleOrderInspectionLines;
            }
            //#endregion

            //#region  After fetch line GUID get the all records from TestChar with the respect of line guid
            if (sLineGuid) {

                let oResultLine = await SELECT.from(VehicleOrderInspectionLinesTestChar).where({ vehicleOrderInspectionLines_vehicleOrderInspectionLines: sLineGuid });

                //Fetch data from line 
                const oResultInspectionLines = await SELECT.one.from(VehicleOrderInspectionLines).where({ vehicleOrderInspectionLines: sLineGuid });


                //Fetch data from Detail  
                const aResultDetails = await SELECT.one.from(VehicleOrderInspectionDetails).where({ vehicleOrderInspectionDetailsUUID: oResultInspectionLines.vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID });
                let oOrderData = await SELECT.one.from(VehicleOrderInspections).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID });

                //#region  If this is overallTestStartDate null set date in the variable 
                if (oResultInspectionLines.overallTestStartDate == null) {
                    dOverAllTestStartDate = new Date();
                } else {
                    dOverAllTestStartDate = oResultInspectionLines.overallTestStartDate;
                }
                //#endregion

                //#region  Check if any test status is "open".  
                // If status is "open", then set End date to null.
                let aApplicableTest = oResultLine.filter(item => ReturnConstants().testTypeStatus.includes(item.testStatus) && ReturnConstants().testTypeName.includes(item.applicableTestName));

                if (aApplicableTest.length > 0) {
                    dOverALllTestEndDate = null;
                } else {
                    dOverALllTestEndDate = new Date();
                }
                //#endregion

                //#region  Order status is set "Completed" when all service tests are completed.  
                if (dOverALllTestEndDate != null) {

                    let oCustomerData = await SELECT.one.from(CustomerMasters).where({ customerUUID: oOrderData.customerCode_customerUUID });
                    const Result = await cds.run(UPDATE(VehicleOrderInspections).set({ orderStatus: ReturnConstants().testStatus.cCompleted, orderSyncedS4: false, orderType: ReturnConstants().orderType.cZVSO }).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID }));
                    const payload = {
                        orderNo: oOrderData.orderNo,//Service Request No.
                        materialCode: oResultInspectionLines.materialCode,
                        lineItemNo: oResultInspectionLines.orderLineNo,
                        orderDate: oOrderData.orderDate,
                        expiresAt: new Date() + 1000 * 60 * 60 // 1 hour and discuss with ADNOC later  about maintenance screen for variables.
                    };

                    // const encrypted = encrypt(JSON.stringify(payload));
                    const sEncryptedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
                    var link = ReturnConstants().customerPortal.basUrl + `/api/download?token=${sEncryptedPayload}`;
                    var SMSMessage = ReturnConstants().ShorySms.SMSMessage.replace("${link}", link);
                    //if (oCustomerData.commTypeSMS === true) {
                    var customerMobileNumber = oCustomerData.countryExtension + oCustomerData.mobileNo;
                    let oSendSMSFlag = await sendSMSFunc([customerMobileNumber], SMSMessage);
                    //}

                    // Commented by Rahul Jain & Abhishek Ashtana as on Oct 17, 2025
                    // if (oCustomerData.commTypeMail === true) {
                    //     //need to modify with properlogic and data
                    //     let responseEmail = await sendEmailFunc(oCustomerData.emailAddress, ReturnConstants().ShorySms.SMSMessage.emailText.replace("${link}", link), ReturnConstants().ShorySms.emailSubject);
                    // }

                }
                //#endregion

                //Over all end & Start date update 
                const Result = await cds.run(UPDATE(VehicleOrderInspectionLines).set({ lineLevelCertLink: link, overallTestStartDate: dOverAllTestStartDate, overallTestEndDate: dOverALllTestEndDate }).where({ vehicleOrderInspectionLines: sLineGuid }));
                const Result1 = cds.run(UPDATE(VehicleOrderInspections).set({ syncOrder: false }).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID }));

                //#region if in the order multiple line exist so that order VehicleOrderInspections table in the property s4Indicator value update empty

                let aInspectionLines = await SELECT.from(VehicleOrderInspectionLines).where({ vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID: aResultDetails.vehicleOrderInspectionDetailsUUID });
                let CompleteOverStatus = aInspectionLines.filter(Item => { return Item.overallTestStartDate == null });
                let aAllLineCom = aInspectionLines.filter(Item => { return Item.overallTestEndDate == null });
                if (oOrderData.orderSyncDate == null && CompleteOverStatus.length > 0) {
                    const Result = await cds.run(UPDATE(VehicleOrderInspections).set({ s4Indicator: '', }).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID }));
                }

                if (aAllLineCom.length == 0) {
                    const Result = await cds.run(UPDATE(VehicleOrderInspections).set({ s4Indicator: 'C', }).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID }));
                }

                if (CompleteOverStatus.length > 0) {
                    const Result = await cds.run(UPDATE(VehicleOrderInspections).set({ orderStatus: ReturnConstants().testStatus.cOpen }).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID }));
                }
                if (oOrderData.orderSyncDate == null && oOrderData.orderSyncedS4 == false) {
                    const Result = await cds.run(UPDATE(VehicleOrderInspections).set({ orderType: ReturnConstants().orderType.cZVSO }).where({ vehicleOrderInspectionUUID: aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID }));
                }



                //#region if in the order multiple vehicle exist in this query

                const FetchDetails = await SELECT.one
                    .from(VehicleOrderInspections)
                    .columns(a => {
                        a("*");
                        a.VehOrdInspDetails(b => {
                            b('*');
                            b.vehOrdInspLines(c => {
                                c("*");
                            });
                        });
                    })
                    .where({
                        vehicleOrderInspectionUUID:
                            aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID
                    });
                if (FetchDetails) {
                    for (const Item of FetchDetails.VehOrdInspDetails) {

                        const hasNullEndDate = Item.vehOrdInspLines.some(
                            LineItem => LineItem.overallTestEndDate === null
                        );

                        if (hasNullEndDate) {
                            if (
                                FetchDetails.orderStatus === ReturnConstants().testStatus.cCompleted &&
                                FetchDetails.s4Indicator === ReturnConstants().testStatus.cS4Indicator
                            ) {
                                await cds.run(
                                    UPDATE(VehicleOrderInspections)
                                        .set({ s4Indicator: ReturnConstants().testStatus.ncS4IndictorNew, orderStatus: ReturnConstants().testStatus.cOpen })
                                        .where({
                                            vehicleOrderInspectionUUID:
                                                aResultDetails.vehicleOrderInspections_vehicleOrderInspectionUUID
                                        })
                                );
                            }
                        }
                    }

                }


                //#endregion
            }
            //#endregion




        } catch (error) {
            throw 'UPDATEOVERALLDATE' + error.message;
        }
    }

    service.before('CREATE', 'PaymentSet', async (req) => {
        var sequenceNumber = new VehicleSequenceGenerator({
            db: db,
            sequence: ReturnConstants().sequences.cPaymentRequestNo,
            table: PaymentDocs,
            field: ReturnConstants().sequences.cPaymentDocNum
        });

        req.data.paymentDocNum = await sequenceNumber.getNextNumber();
    })

    /*****************************************************************************
    * This action is used to create ES_IN for maha test
    /******************************************************************************/
    service.on("executeMahaTests", async (req) => {
        try {
            const { aPrevServiceRequestNos, aChildData } = req.data;
            const results = [];
            let bRetest = false;

            if (aPrevServiceRequestNos != null || aPrevServiceRequestNos != undefined) {
                for (const serviceRequestNo of aPrevServiceRequestNos) {
                    const oHeaderData = await SELECT.one.from(VehicleOrderInspections).where({ serviceRequestNo });

                    if (!oHeaderData) {
                        results.push(`${'HEADERNOTFOUND'} ${serviceRequestNo}`);
                        continue;
                    }
                    const detailData = await SELECT.one.from(VehicleOrderInspectionDetails)
                        .where({ vehicleOrderInspections_vehicleOrderInspectionUUID: oHeaderData.vehicleOrderInspectionUUID });

                    if (!detailData) {
                        results.push(`${'CHILDNOTFOUND'} ${oHeaderData.vehicleOrderInspectionUUID}`);
                        continue;
                    }

                    for (const item of aChildData) {
                        if (!item.currMaterialCode || !item.currOrderLineNo || !item.currVehicleOrderInspectionUUID || !item.currServiceRequestNo || !item.prevVehicleOrderInspectionLines) {
                            continue;
                        }
                        const lineExists = await SELECT.one.from(VehicleOrderInspectionLines).where({
                            vehicleOrderInspectionLines: item.prevVehicleOrderInspectionLines
                        });
                        if (!lineExists) {
                            continue;
                        }
                        await cds.run(
                            UPDATE(VehicleOrderInspectionLines)
                                .set({
                                    childMaterialCode: item.currMaterialCode,
                                    childOrderLineNo: item.currOrderLineNo,
                                    childOrderNo_vehicleOrderInspectionUUID: item.currVehicleOrderInspectionUUID,
                                    childSeviceRequestNo: item.currServiceRequestNo
                                })
                                .where({ vehicleOrderInspectionLines: item.prevVehicleOrderInspectionLines })
                        );
                        bRetest = true;
                    }
                }
            }
            // Generate ES_IN  for FREST_TEST
            if (aPrevServiceRequestNos === null && bRetest === false) {
                let sServiceRequestNo = aChildData[0].currServiceRequestNo;
                const oQuery = SELECT.from(VehicleOrderInspections)
                    .columns(a => {
                        a('*');
                        a.VehOrdInspDetails(b => {
                            b('*');
                            b.VehicleDetails('*');
                            b.vehOrdInspLines(l => {
                                l('*');
                                l.vehOrdInspLinesTestChars('*');
                            });
                        });
                    })
                    .where({
                        serviceRequestNo: sServiceRequestNo

                    });

                // Execute Query to get the result
                const oDataResult = await cds.tx(async tx => await tx.run(oQuery));
                if (!oDataResult.length > 0) {
                    return;
                }
                let aVehOrdInspDetailList = oDataResult[0].VehOrdInspDetails;
                let sPlantCode = oDataResult[0].plantCode;

                for (let vehicle of aVehOrdInspDetailList) {

                    let sVehicleGuid = vehicle.VehicleDetails_vehicleMastersUUID;
                    let oVehicleMasterData = await SELECT.one.from(VehicleMasters).where({ vehicleMastersUUID: sVehicleGuid });

                    if (oVehicleMasterData) {

                        if (oVehicleMasterData.registrationDate) {
                            let dRegistrationDate = oVehicleMasterData.registrationDate.substring(0, 10).replace(/-/g, '');
                            oVehicleMasterData.registrationDate = dRegistrationDate;
                        } else {
                            oVehicleMasterData.registrationDate = '';
                        }


                        for (let line of vehicle.vehOrdInspLines) {

                            if (line.materialType == ReturnConstants().materialType.cZvts) {
                                let sOrderLineNumber = line.orderLineNo;

                                for (let test of line.vehOrdInspLinesTestChars) {
                                    if (test.applicableTestName == ReturnConstants().testType.cESIN) {
                                        if (line.inspectionType == ReturnConstants().inspectionType.cFreshTest) {
                                            let sVehicleOrderInspectionLinesTestCharUUID = test.VehicleOrderInspectionLinesTestCharUUID;
                                            let aListFreshTestMahaCode = await SELECT.from(MahaConfigurations)
                                                .where({ mahaType: ReturnConstants().testType.cESIN })
                                                .orderBy({ sequenceNumber: 'asc' });

                                            let sEsInFileName = `${sPlantCode}_${sServiceRequestNo}_${sOrderLineNumber}.${ReturnConstants().maha.fileExtTxt}`;

                                            let sContent = "";
                                            // Loop through each mapping definition
                                            for (let item of aListFreshTestMahaCode) {
                                                let { fieldSourceTable, fieldSourceName, mahaFieldCode, fieldSourceValue } = item;
                                                let value = "";

                                                try {
                                                    // Case 1: Vehicle Master Table → pull directly from in-memory object
                                                    if (fieldSourceTable === ReturnConstants().maha.vehicleMasterTable) {
                                                        if (oVehicleMasterData.hasOwnProperty(fieldSourceName)) {
                                                            value = oVehicleMasterData[fieldSourceName] ?? "";
                                                            if (value === ReturnConstants().maha.valueNA || value === null || value === undefined) {
                                                                value = "";
                                                            }
                                                            sContent += `${mahaFieldCode}=${value}\r\n`;
                                                        }
                                                    }
                                                    // ✅ Special rule for default table when mahaFieldCode is empty
                                                    if ((!mahaFieldCode || mahaFieldCode.trim() === "")
                                                        && fieldSourceTable === ReturnConstants().maha.default) {
                                                        value = fieldSourceValue;

                                                        sContent += `${value}\r\n`;
                                                    }
                                                    else if (fieldSourceTable === ReturnConstants().maha.default) {
                                                        value = fieldSourceValue;
                                                        sContent += `${mahaFieldCode}=${value}\r\n`;

                                                    }
                                                } catch (err) {
                                                    throw req.error('ERRORMAHAFIELDTABLE' + err.message);
                                                }
                                            }

                                            const buffer = Buffer.from(sContent, 'utf-8');
                                            let sBase64Content = buffer.toString(ReturnConstants().maha.cBase64);

                                            let oMahaEsInPayload = {
                                                Site_no: sPlantCode,
                                                File_name: sEsInFileName,
                                                File_Content: sBase64Content,
                                                fileUploadPath: "",
                                                btpApp: ReturnConstants().itcConstants.cBtpApp
                                            };

                                            let oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
                                            let aResMahaEsIn = await oConnectionPost.post(ReturnConstants().destinationCLM.cSapBtpToMahaEsIn, oMahaEsInPayload);

                                            let sResponseMessage = aResMahaEsIn.responseStatus.statusMsg;
                                            if (sResponseMessage == ReturnConstants().apiResponse.cSuccess) {
                                                await UPDATE('VehicleOrderInspectionLinesTestChar')
                                                    .set({
                                                        testStatus: ReturnConstants().testStatus.cCompleted,
                                                        testComments: ReturnConstants().testAdditionalInfo.cComment,
                                                        testInspectedBy: ReturnConstants().testAdditionalInfo.cInspector,
                                                        testInspectionStartDate: new Date(),
                                                        testInspectionEndDate: new Date()
                                                    })
                                                    .where({ VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID });

                                                let oESINDetailResPayload = {
                                                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID,
                                                    Type: ReturnConstants().testType.cESIN,
                                                    startDate: new Date(),
                                                    completedDate: new Date(),
                                                    attachmentData: sBase64Content,
                                                    attachmentName: sEsInFileName,
                                                    inUse: true
                                                };

                                                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);

                                                results.push(sEsInFileName);
                                            }
                                            else {
                                                // If es_in give error then insert into this
                                                let sResponseMessage = aResMahaEsIn.responseStatus.errorDetails[0].message;
                                                let oESINDetailResPayload = {
                                                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID,
                                                    Type: ReturnConstants().testType.cESIN,
                                                    startDate: new Date(),
                                                    attachmentData: sBase64Content,
                                                    attachmentName: sEsInFileName,
                                                    inUse: true,
                                                    isError: true,
                                                    errorDesc: sResponseMessage
                                                };

                                                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                                                results.push(sResponseMessage);
                                            }
                                        }

                                    }
                                }
                            }
                        }

                    }
                }
            }

            // maha test for Retest 
            else {
                for (let child of aChildData) {

                    if (child.currTestType === ReturnConstants().inspectionType.cRetestTest) {
                        let sServiceRequestNo = child.currServiceRequestNo;
                        let sOrderLineNumber = child.currOrderLineNo;

                        let aOrderData = await SELECT.one.from(VehicleOrderInspections)
                            .where({ serviceRequestNo: sServiceRequestNo });

                        let sPlantCode = aOrderData.plantCode;
                        //Get current test char data
                        let aCurrTestCharData = await SELECT.from(VehicleOrderInspectionLinesTestChar)
                            .where({ vehicleOrderInspectionLines_vehicleOrderInspectionLines: child.currVehicleOrderInspectionLines });

                        let aCurrEsInData = aCurrTestCharData.filter(item => item.applicableTestName === ReturnConstants().testType.cESIN);
                        let sCurrEsInTestUUID = aCurrEsInData[0].VehicleOrderInspectionLinesTestCharUUID;
                        //   Get previous MAHA result (ES_OUT) file  
                        let aPreTestCharData = await SELECT.from(VehicleOrderInspectionLinesTestChar)
                            .where({ vehicleOrderInspectionLines_vehicleOrderInspectionLines: child.prevVehicleOrderInspectionLines });

                        let aPreEsOutData = aPreTestCharData.filter(item => item.applicableTestName === ReturnConstants().testType.cESOUT);

                        let sPreEsOutTestUUID = aPreEsOutData[0].VehicleOrderInspectionLinesTestCharUUID;
                        let sEsOutTestStatus = aPreEsOutData[0].testStatus;

                        if (sEsOutTestStatus != ReturnConstants().testStatus.cOpen) {
                            let aPreEsOutFileDtl = await SELECT.one.from(testResMahaOutDtl)
                                .where({ vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sPreEsOutTestUUID });

                            let sBase64Content = aPreEsOutFileDtl.attachmentData;
                            let sEsInFileName = `${sPlantCode}_${sServiceRequestNo}_${sOrderLineNumber}.${ReturnConstants().maha.fileExtTxt}`;

                            let oMahaEsInPayload = {
                                Site_no: sPlantCode,
                                File_name: sEsInFileName,
                                File_Content: sBase64Content,
                                fileUploadPath: "",
                                btpApp: ReturnConstants().itcConstants.cBtpApp
                            };

                            let oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
                            let aResMahaEsIn = await oConnectionPost.post(ReturnConstants().destinationCLM.cSapBtpToMahaEsIn, oMahaEsInPayload);

                            let sResponseMessage = aResMahaEsIn.responseStatus.statusMsg;

                            if (sResponseMessage == ReturnConstants().apiResponse.cSuccess) {

                                await UPDATE('VehicleOrderInspectionLinesTestChar')
                                    .set({
                                        testStatus: ReturnConstants().testStatus.cCompleted,
                                        testComments: ReturnConstants().testAdditionalInfo.cComment,
                                        testInspectedBy: ReturnConstants().testAdditionalInfo.cInspector,
                                        testInspectionStartDate: new Date(),
                                        testInspectionEndDate: new Date()
                                    })
                                    .where({ VehicleOrderInspectionLinesTestCharUUID: sCurrEsInTestUUID });

                                let oESINDetailResPayload = {
                                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sCurrEsInTestUUID,
                                    Type: ReturnConstants().testType.cESIN,
                                    startDate: new Date(),
                                    completedDate: new Date(),
                                    attachmentData: sBase64Content,
                                    attachmentName: sEsInFileName,
                                    inUse: true
                                };

                                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                                results.push(sEsInFileName);
                            }
                            else { // If es_in give error then insert into this
                                let sResponseMessage = aResMahaEsIn.responseStatus.errorDetails[0].message;
                                let oESINDetailResPayload = {
                                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sCurrEsInTestUUID,
                                    Type: ReturnConstants().testType.cESIN,
                                    startDate: new Date(),
                                    attachmentData: sBase64Content,
                                    attachmentName: sEsInFileName,
                                    inUse: true,
                                    isError: true,
                                    errorDesc: sResponseMessage
                                };

                                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                                results.push(sResponseMessage);
                            }
                        }
                    }
                    //  When Restest order having fresh test material
                    else {
                        if (child.currTestType === ReturnConstants().inspectionType.cFreshTest) {
                            const oQuery = SELECT.from(VehicleOrderInspections)
                                .columns(a => {
                                    a('*');
                                    a.VehOrdInspDetails(b => {
                                        b('*');
                                        b.VehicleDetails('*');
                                        b.vehOrdInspLines(l => {
                                            l('*');
                                            l.vehOrdInspLinesTestChars('*');
                                        });
                                    });
                                })
                                .where({
                                    serviceRequestNo: child.currServiceRequestNo
                                });


                            // Execute Query
                            const oDataResult = await cds.tx(async tx => await tx.run(oQuery));

                            if (!oDataResult.length > 0) {
                                return;
                            }

                            let aOrderResponse = oDataResult[0];
                            let sServiceRequestNo = child.currServiceRequestNo;
                            let sOrderLineNumber = child.currOrderLineNo;
                            let sPlantCode = aOrderResponse.plantCode;

                            let aMatchingLines = aOrderResponse.VehOrdInspDetails
                                .flatMap(detail => detail.vehOrdInspLines)
                                .filter(line =>
                                    line.vehicleOrderInspectionLines === child.currVehicleOrderInspectionLines &&
                                    line.vehOrdInspLinesTestChars.some(
                                        item => item.applicableTestName === ReturnConstants().testType.cESIN
                                    )
                                );
                            let sVehDetailUUID = aMatchingLines[0].vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID;

                            // Get vehicle details
                            const oQueryVeh = SELECT.from(VehicleOrderInspectionDetails)
                                .columns(a => {
                                    a('*');
                                    a.VehicleDetails(b => {
                                        b('*');
                                    });
                                }).where({ vehicleOrderInspectionDetailsUUID: sVehDetailUUID })

                            let aVehResult = await cds.tx(async tx => await tx.run(oQueryVeh));

                            let oVehicleMasterData = aVehResult[0].VehicleDetails;

                            if (oVehicleMasterData.registrationDate) {
                                let dRegistrationDate = oVehicleMasterData.registrationDate.substring(0, 10).replace(/-/g, '');
                                oVehicleMasterData.registrationDate = dRegistrationDate;
                            } else {
                                oVehicleMasterData.registrationDate = ''; // or null, depending on your needs
                            }

                            let sTestCharData = aMatchingLines[0].vehOrdInspLinesTestChars
                                .filter(item => item.applicableTestName == ReturnConstants().testType.cESIN);

                            let sVehicleOrderInspectionLinesTestCharUUID = sTestCharData[0].VehicleOrderInspectionLinesTestCharUUID;

                            /// file generate
                            let aListFreshTestMahaCode = await SELECT.from(MahaConfigurations)
                                .where({ mahaType: ReturnConstants().testType.cESIN })
                                .orderBy({ sequenceNumber: ReturnConstants().maha.cASC });

                            let sEsInFileName = `${sPlantCode}_${sServiceRequestNo}_${sOrderLineNumber}.${ReturnConstants().maha.fileExtTxt}`;
                            let sContent = "";
                            // Loop through each mapping definition
                            for (let item of aListFreshTestMahaCode) {
                                let { fieldSourceTable, fieldSourceName, mahaFieldCode, fieldSourceValue } = item;
                                let value = "";

                                try {
                                    // Vehicle Master Table → pull directly from in-memory object
                                    if (fieldSourceTable === ReturnConstants().maha.vehicleMasterTable) {
                                        if (oVehicleMasterData.hasOwnProperty(fieldSourceName)) {
                                            value = oVehicleMasterData[fieldSourceName] ?? "";
                                            if (value === ReturnConstants().maha.valueNA || value === null || value === undefined) {
                                                value = "";
                                            }
                                            sContent += `${mahaFieldCode}=${value}\r\n`;
                                        }
                                    }
                                    // Special rule for default table when mahaFieldCode is empty
                                    if ((!mahaFieldCode || mahaFieldCode.trim() === "")
                                        && fieldSourceTable === ReturnConstants().maha.default) {
                                        value = fieldSourceValue;

                                        sContent += `${value}\r\n`;
                                    }
                                    else if (fieldSourceTable === ReturnConstants().maha.default) {
                                        value = fieldSourceValue;
                                        sContent += `${mahaFieldCode}=${value}\r\n`;

                                    }
                                } catch (err) {
                                    throw req.error('ERRORMAHAFIELDTABLE' + err.message);
                                }
                            }
                            const buffer = Buffer.from(sContent, 'utf-8');
                            let sBase64Content = buffer.toString(ReturnConstants().maha.cBase64);

                            let oMahaEsInPayload = {
                                Site_no: sPlantCode,
                                File_name: sEsInFileName,
                                File_Content: sBase64Content,
                                fileUploadPath: "",
                                btpApp: ReturnConstants().itcConstants.cBtpApp
                            };

                            let oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
                            let aResMahaEsIn = await oConnectionPost.post(ReturnConstants().destinationCLM.cSapBtpToMahaEsIn, oMahaEsInPayload);

                            let sResponseMessage = aResMahaEsIn.responseStatus.statusMsg;
                            if (sResponseMessage == ReturnConstants().apiResponse.cSuccess) {

                                await UPDATE('VehicleOrderInspectionLinesTestChar')
                                    .set({
                                        testStatus: ReturnConstants().testStatus.cCompleted,
                                        testComments: ReturnConstants().testAdditionalInfo.cComment,
                                        testInspectedBy: ReturnConstants().testAdditionalInfo.cInspector,
                                        testInspectionStartDate: new Date(),
                                        testInspectionEndDate: new Date()
                                    })
                                    .where({ VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID });

                                let oESINDetailResPayload = {
                                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID,
                                    Type: ReturnConstants().testType.cESIN,
                                    startDate: new Date(),
                                    completedDate: new Date(),
                                    attachmentData: sBase64Content,
                                    attachmentName: sEsInFileName,
                                    inUse: true
                                };

                                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);

                                results.push(sEsInFileName);
                            }
                            else { // If es_in give error then insert into this
                                let sResponseMessage = aResMahaEsIn.responseStatus.errorDetails[0].message;
                                let oESINDetailResPayload = {
                                    vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: sVehicleOrderInspectionLinesTestCharUUID,
                                    Type: ReturnConstants().testType.cESIN,
                                    startDate: new Date(),
                                    // completedDate: new Date(),
                                    attachmentData: sBase64Content,
                                    attachmentName: sEsInFileName,
                                    inUse: true,
                                    isError: true,
                                    errorDesc: sResponseMessage
                                };

                                await INSERT.into(testResMahaInDtl).entries(oESINDetailResPayload);
                                results.push(sResponseMessage);
                            }
                        }
                    }

                }

            }
            return results;
        } catch (error) {
            return req.error(error.message);
        }
    });

    /*****************************************************************************
    * This action is used to generate the UTRN number and is called in the after event of VehicleOrderInspections.
    /******************************************************************************/
    async function generateUTRNNumber(req) {
        try {
            let sOrderDate = formatISOToDateTimeString(req.orderDate);
            if (sOrderDate) {
                let datePart = sOrderDate.split(" ")[0];
                sOrderDate = datePart.replace(/-/g, '');
            }
            // The Employee Code is currently hardcoded. We will change it soon after implementing XSUAA
            let sQuery = ReturnConstants().cGenerateUTRNNumber.cQuery;
            let oResult = await cds.run(sQuery);
            if (oResult) {
                let oUTRNObject = {
                    orderDate: sOrderDate,
                    ShiftNumber: oResult[0].EMPSHIFT_SHIFTID,
                    plantCode: oResult[0].PLANTCODE,
                    serviceRequestNo: req.serviceRequestNo,
                    Reserved: ReturnConstants().cGenerateUTRNNumber.cReserved,
                    LOB: ReturnConstants().cGenerateUTRNNumber.cLOB
                }

                //let sGeneratedNumber = oUTRNObject.orderDatfe + oUTRNObject.plantCode + oUTRNObject.ShiftNumber + oUTRNObject.LOB + oUTRNObject.Reserved + oUTRNObject.serviceRequestNo
                let sGeneratedNumber = oUTRNObject.orderDate + oUTRNObject.plantCode + oUTRNObject.ShiftNumber + oUTRNObject.LOB + oUTRNObject.Reserved + oUTRNObject.serviceRequestNo
                return sGeneratedNumber;
            } else {
                let Error = {
                    ErrorCode: 'ERRORCODE',
                    ErrorMessage: 'EMPLOYEDTANOTFOUND'
                }
                return Error;
            }

        } catch (error) {
            const customError = {
                code: 'ERRORCODE',
                message: 'ERRORMESSAGEGENERETINGUTRN' + error.message
            };
            throw customError;
        }
    }

    /*****************************************************************************
   * This Function is used to get Customer Details from CPI
   /******************************************************************************/
    service.on("getP24CustomerDetail", async (req) => {

        const oHasVehicle = !!req.data.vehicleReg;

        const oParameters = {
            crmid: null,
            tokenNumber: oHasVehicle ? null : req.data.tokenNumber,
            customerId: null,
            vehicleReg: oHasVehicle ? req.data.vehicleReg : null
        };
        try {
            let oConnectionPost = await cds.connect.to(ReturnConstants().destinationCPI.cDestination);
            let aLoyaltyResult = await oConnectionPost.post(ReturnConstants().destinationCPI.cGetCustomerDetails, oParameters)

            return aLoyaltyResult;

        } catch (errobj) {
            throw req.error('CUSTOMERDETAILS', errobj.message);

        }

    });

    /*****************************************************************************
    * This Action is used to get Payment data  
    /******************************************************************************/
    service.on("getPaymentP24", async (req) => {
        const { Payload } = req.data

        try {
            let oConnectionPost = await cds.connect.to(ReturnConstants().destinationCPI.cDestination);
            let aP24Result = await oConnectionPost.post(ReturnConstants().destinationCPI.cGetPayment, Payload);
            return aP24Result;
        } catch (errobj) {
            req.error('GETPAYMENT', errobj.message);
        }
    });

    /*****************************************************************************
    This action is used to send the SMS notification to notify the customers for their pre-Inspection registration expirations.
    /******************************************************************************/
    async function sendShorySmsNotificationForPreInspectionFunc() {
        try {

            //var logString = "****************************" + ReturnConstants().ShorySmsPre.executionStartMsg + getCurrentDateTimeString() + "****************************";
            var allMobileNumber = [];
            //executing procedure to get the data
            let result = await cds.run(ReturnConstants().cProcedures.shorySmsNotificationPreInspectionProcedure);
            result = result.RESULT;

            //result = [result[0]];
            var objectResponse = [];
            //logString = logString + ReturnConstants().ShorySmsPre.totalRecordProcessed + result.length + ReturnConstants().ShorySmsPre.dataFromCustMaster;
            if (result.length > 0) {
                for (let item of result) {
                    //executing the procedure to get the customer mobile number
                    /* let customerMobileNumber = await cds.run(`
                    DO BEGIN
                      DECLARE MOBILENO_RESULT NVARCHAR(20);
                      CALL "GETCUSTOMERMOBILENUMBERPROCEDURE"('${item.CUSTOMERMASTERS_CUSTOMERUUID}', MOBILENO_RESULT);
                      SELECT :MOBILENO_RESULT AS MOBILENO FROM DUMMY;
                    END;
                  `);
                    customerMobileNumber = customerMobileNumber?.changes?.[1]?.[0]?.MOBILENO ?? '';
                    */
                    customerMobileNumber = item.MOBILENO ?? '';

                    if (customerMobileNumber != '') {

                        //customerMobileNumber = '919650037303'; // For testing purpose
                        var mobileNumber = [customerMobileNumber];
                        allMobileNumber.push(customerMobileNumber);
                        let messageBody = ReturnConstants().shorySmsText.cPreInspectionSmsTextEnglish;

                        //calling the function to send the SMS
                        let responseSms = await sendSMSFunc(mobileNumber, messageBody);
                        //logString = logString + ReturnConstants().ShorySmsPre.smsSentToCustMaster + customerMobileNumber + "\n";
                        var isDelivered = true;
                        var failureReason = '';
                        //logString = logString + ReturnConstants().ShorySmsPre.responseApi + JSON.stringify(responseSms) + " \n";
                        if (responseSms.data[0].status == ReturnConstants().ShorySmsPre.errorStatus) {
                            isDelivered = false;
                            failureReason = responseSms.data[0].description;
                        }
                        //object creation for insertin into smsNotificationHistory table
                        var objNotificationHistory = {
                            ID: cds.utils.uuid(),
                            scenarioType: ReturnConstants().ShorySmsPre.scenarioType,
                            smsContent: messageBody,
                            messageSentDate: getFormattedDate(),
                            receipientMobile: customerMobileNumber,
                            isDelivered: isDelivered,
                            failureReason: failureReason
                        };
                        objectResponse.push({
                            orderId: item.SERVICEREQUESTNO,
                            receipientMobile: customerMobileNumber,
                            sentTo: item.FIRSTNAME + " " + item.LASTNAME,
                            PlateNumber: item.PLATENUMBER,
                            status: isDelivered,
                            failureReason: failureReason
                        });
                        //insertion into smsNotificationHistory
                        await INSERT.into(smsNotificationHistory).entries(objNotificationHistory);
                        //logString = logString + ReturnConstants().ShorySmsPre.tableInsertionNotificationTxt + JSON.stringify(objNotificationHistory) + " \n";
                    }

                }
                var textFileName = ReturnConstants().cShoryInspectionLogFile.cPreInsPectionLogFilename + new Date().toISOString() + ".txt";
                //logString = logString + ReturnConstants().Mahapass.logFileNameString + textFileName + '\n';
                //logString = logString + '\n****************************' + ReturnConstants().ShorySmsPre.executionEndMsg + getCurrentDateTimeString() + '****************************\n';
                //await createLogFileOnDMSFunc(logString, textFileName);
                //return result.length + ReturnConstants().ShorySms.recordProcessed;
                return objectResponse;
            } else {
                return result.length + ReturnConstants().ShorySms.recordProcessed;
            }
        } catch (error) {
            return error.message;
        }
    }
    service.on('sendShorySmsNotificationForPreInspection', async (req) => {
        return await sendShorySmsNotificationForPreInspectionFunc();

    })

    /*****************************************************************************
   This action is used to send the SMS notification to notify the customers for their Inspection registration expirations.
   /******************************************************************************/
    async function sendShorySmsNotificationForInspectionFunc() {
        try {
            //var logString = "****************************" + ReturnConstants().ShorySms.executionStartMsg + getCurrentDateTimeString() + "****************************";
            var allMobileNumber = [];

            //executing procedure to get the data
            let result = await cds.run(ReturnConstants().cProcedures.shorySmsNotificationInspectionProcedure);

            result = result.RESULT;

            var objectResponse = [];

            //logString = logString + ReturnConstants().ShorySms.totalRecordProcessed + result.length + ReturnConstants().ShorySms.dataFromCustMaster;
            if (result.length > 0) {
                for (let item of result) {
                    //return item.VEHICLEORDERINSPECTIONDETAILSUUID;
                    let customerMobileNumber = item.MOBILENO ?? '';

                    if (customerMobileNumber != '') {

                        //customerMobileNumber = '919582210688'; // For testing purpose
                        var mobileNumber = [customerMobileNumber];
                        allMobileNumber.push(customerMobileNumber);
                        let messageBody = ReturnConstants().shorySmsText.cInspectionSmsTextEnglish;

                        //calling the function to send the SMS
                        let responseSms = await sendSMSFunc(mobileNumber, messageBody);
                        //logString = logString + ReturnConstants().ShorySms.smsSentToCustMaster + customerMobileNumber + "\n";
                        var isDelivered = true;
                        var failureReason = '';
                        var shoryInspNotifSent = true;
                        var shoryInspNotifAt = new Date();
                        var shoryInspNotifStatus = 'S';
                        var shoryInspNotifError = '';
                        //logString = logString + ReturnConstants().ShorySms.responseApi + JSON.stringify(responseSms) + " \n";
                        if (responseSms.data[0].status == ReturnConstants().ShorySms.errorStatus) {
                            isDelivered = false;
                            failureReason = responseSms.data[0].description;
                            shoryInspNotifSent = false;
                            shoryInspNotifStatus = 'F';
                            shoryInspNotifError = responseSms.data[0].description;
                        }
                        await UPDATE(VehicleOrderInspectionDetails)
                            .set({
                                shoryInspNotifSent: shoryInspNotifSent,
                                shoryInspNotifAt: shoryInspNotifAt,
                                shoryInspNotifStatus: shoryInspNotifStatus,
                                shoryInspNotifStatus: shoryInspNotifStatus,
                                shoryInspNotifError: shoryInspNotifError
                            })
                            .where({ vehicleOrderInspectionDetailsUUID: item.VEHICLEORDERINSPECTIONDETAILSUUID })

                        //object creation for insertin into smsNotificationHistory table
                        var objNotificationHistory = {
                            ID: cds.utils.uuid(),
                            scenarioType: ReturnConstants().ShorySms.scenarioType,
                            smsContent: messageBody,
                            messageSentDate: getFormattedDate(),
                            receipientMobile: customerMobileNumber,
                            //receipientMobile: 123,
                            isDelivered: isDelivered,
                            failureReason: failureReason
                        };
                        objectResponse.push({
                            orderId: item.SERVICEREQUESTNO,
                            receipientMobile: customerMobileNumber,
                            sentTo: item.FIRSTNAME + " " + item.LASTNAME,
                            PlateNumber: item.PLATENUMBER,
                            status: isDelivered,
                            failureReason: failureReason
                        });
                        /*
                        
                        */
                        //insertion into smsNotificationHistory
                        await INSERT.into(smsNotificationHistory).entries(objNotificationHistory);
                        //logString = logString + ReturnConstants().ShorySms.tableInsertionNotificationTxt + JSON.stringify(objNotificationHistory) + " \n";
                    }

                }
                var textFileName = ReturnConstants().cShoryInspectionLogFile.cInsPectionLogFilename + new Date().toISOString() + ".txt";
                //logString = logString + ReturnConstants().Mahapass.logFileNameString + textFileName + '\n';
                //logString = logString + '\n****************************' + ReturnConstants().ShorySms.executionEndMsg + getCurrentDateTimeString() + '****************************\n';
                //await createLogFileOnDMSFunc(logString, textFileName);
                //return result.length + ReturnConstants().ShorySms.recordProcessed;
                return objectResponse;
            } else {
                return ReturnConstants().employeePasswordNotification.noRecordProcessed;
            }
        } catch (error) {
            return error.message;
        }
    }
    service.on('sendShorySmsNotificationForInspection', async (req) => {
        return await sendShorySmsNotificationForInspectionFunc();

    })

    /****************************************************************************** 
     * Method to fetch decrypt Key
    /*****************************************************************************/
    service.on("getKey", async () => {
        const oBinding = JSON.parse(process.env.VCAP_SERVICES).credstore[0].credentials;
        try {
            const oReadRes = await readCredential(oBinding, ReturnConstants().cGetKey.cADDVI, ReturnConstants().cGetKey.cKey, ReturnConstants().cGetKey.cADDVICLM);
            const oReadResIV = await readCredential(oBinding, ReturnConstants().cGetKey.cADDVI, ReturnConstants().cGetKey.cKey, ReturnConstants().cGetKey.cADDVICLMIV);
            let oResult = {
                key: oReadRes,
                iv: oReadResIV
            }
            return oResult;
        } catch (error) {
            let oJsonContent = error.reason.response.body;
            let sMessage = oJsonContent.error.message;
            LOG.error(sMessage);
        }

    });


    /****************************************************************************** 
    * Method to get sequnse before create customer
   /*****************************************************************************/

    service.before('CREATE', 'CustomerMasters', async (req) => {
        const vehicles = req.data.vehicleMasters;
        var sequenceNumber = new VehicleSequenceGenerator({
            db: db,
            sequence: ReturnConstants().sequences.cCustomerRequestNum,
            table: CustomerMasters,
            field: ReturnConstants().sequences.cCustomerNum
        });
        req.data.customerNo = await sequenceNumber.getNextNumber();

        if (!vehicles || vehicles.length === 0) return;
        const v = vehicles[0];
        const oCondition = {
            plateNumber: v.plateNumber,
            plateTypeCode: v.plateTypeCode,
            chasisNumber: v.chasisNumber,
            countryCode: v.countryCode
        };

        const exists = await SELECT.one.from(VehicleMasters).where(oCondition);
        if (exists) {
            req.error({
                code: ReturnConstants().ErrorCode.AllreadyExist,
                message: 'ERRORALLREADYEXIST'
            });
        }
    })

    /****************************************************************************** 
    * Method to validate customer Payload
   /*****************************************************************************/
    function payloadValidationForCreateCutomer(payload) {
        //return true
        var payloadData = payload.CustomerSet.Customer;
        var error = '';
        var isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payloadData.EMail);
        var isValidFromDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payloadData.Validfromdate);
        var isValidToDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payloadData.Validtodate);

        if (payloadData.CustomerNumber == '' || payloadData.CustomerNumber == null) {
            error = error + ReturnConstants().cSyncCustomerValidation.cCustomerNumber + payloadData.CustomerNumber + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.EMail == '' || payloadData.EMail == null) {
            error = error + ReturnConstants().cSyncCustomerValidation.cEmail + payloadData.EMail + ReturnConstants().cGeneralError.cInvalid;
        }
        if (!isValidEmail) {
            error = error + ReturnConstants().cSyncCustomerValidation.cEmail + payloadData.EMail + ReturnConstants().cSyncCustomerValidation.cEmailInvalid;
        }
        if (payloadData.Mobile == '' || payloadData.Mobile == null) {
            error = error + ReturnConstants().cSyncCustomerValidation.cMobile + payloadData.Mobile + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.Validfromdate == '' || payloadData.Validfromdate == null) {
            error = error + ReturnConstants().cSyncCustomerValidation.cFromdate + payloadData.Validfromdate + ReturnConstants().cGeneralError.cInvalid;
        }
        /*if (!isValidFromDate) {
            error = error + 'Invalid DateFromat for Validfromdate :' + payloadData.Validfromdate + '  .';
        }*/
        if (payloadData.Validtodate == '' || payloadData.Validtodate == null) {
            error = error + ReturnConstants().cSyncCustomerValidation.cTodate + payloadData.Validtodate + ReturnConstants().cGeneralError.cInvalid;
        }
        /*if (!isValidToDate) {
            error = error + 'Invalid DateFromat for Validtodate :' + payloadData.Validtodate + '  .';
        }*/
        if (error == '') {
            return 'success';
        } else {
            return 'ERRORSINPAYLOAD' + error;
        }
    }
    /****************************************************************************** 
    * Method to create Log file on DMS
   /*****************************************************************************/
    async function createLogFileOnDMSFunc(logString, textFileName) {
        //create new file
        let ext = path.extname(textFileName);
        let orgFileName = path.basename(textFileName, ext);
        let newFilePaylodForDMS = {
            "Files": [
                {
                    "attachmentGuId": null,
                    "attachmentName": textFileName,
                    "orgFileName": orgFileName,
                    "orgFileExtension": "txt",
                    "docType": null,
                    "docId": null,
                    "docGuid": null,
                    "base64File": Buffer.from(logString).toString('base64')
                }
            ]
        };
        let responceDMS = await uploadAttachmentInDMSFunc(newFilePaylodForDMS);
        return responceDMS;
    }
    /****************************************************************************** 
     * Method to delete files on DMS and DB
    /*****************************************************************************/
    async function delImageCertificateFromDmsFunc() {
        const aFiles = [];
        try {
            //getting 6 months old Images and Certificates from DB pdf png jpg
            const dSixMonthsAgo = new Date();
            dSixMonthsAgo.setMonth(dSixMonthsAgo.getMonth() - 6);
            const oResult = await cds.run(SELECT
                .columns('attachmentGuId')
                .from(DAttachment)
                .where({
                    createdAt: { '<': dSixMonthsAgo },
                    orgFileExtension: { in: ['pdf', 'png', 'jpg'] }
                })
            );

            if (oResult.length > 0) {
                for (const item of oResult) {
                    aFiles.push({
                        attachmentGuId: item.attachmentGuId
                    });
                }
            }
            if (aFiles.length > 0) {
                const oPayload = { Files: aFiles };
                const serviceResponse = await service.send('deleteAttachmentFromDMS', oPayload);
                return serviceResponse;
            } else {
                return ReturnConstants().employeePasswordNotification.noRecordProcessed;
            }

        } catch (err) {
            return err.message;
        }

    }
    service.on('delImageCertificateFromDms', async (req) => {
        return await delImageCertificateFromDmsFunc();
    })
    /****************************************************************************** 
     * Method to send Employee password details from BTP to MAHA
    /*****************************************************************************/
    function getFormattedDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');

        const hh = String(today.getHours()).padStart(2, '0');
        const min = String(today.getMinutes()).padStart(2, '0');
        const ss = String(today.getSeconds()).padStart(2, '0');
        const ms = String(today.getMilliseconds()).padStart(3, '0');
        const micro = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

        //const formattedDate = `${yyyy}-${mm}-${dd}`;
        const formattedDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}${micro}`;
        return formattedDate;
    }
    async function mahaSendPwdFileFunc() {

        //get the employee details from ADD_VI_EMPLOYEEMASTER

        //var logString = "**************************** " + ReturnConstants().Mahapass.mahaPassLogFileExecutionStartMsg + getCurrentDateTimeString() + " ****************************";
        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        const result = await cds.run(SELECT.from(EmployeeMaster).where({
            empStatus: ReturnConstants().Mahapass.empStatus,
            empRole: ReturnConstants().Mahapass.empRole,
            plantCode: { '!=': null },
            mahaPassword: { '!=': null }
        }));

        //logString = logString + ReturnConstants().Mahapass.totalRecordProcessed + result.length + ReturnConstants().Mahapass.dataFromEmpMaster;
        var groupedData = {};
        if (result.length > 0) {
            for (const item of result) {
                const plantCode = item.plantCode;
                if (!groupedData[plantCode]) {
                    groupedData[plantCode] = [];
                }
                groupedData[plantCode].push({
                    EMPCODE: item.empCode,
                    EMPNAMEENGLISH: item.empNameEnglish,
                    MAHAPASSWORD: item.mahaPassword
                });
            }
        }

        if (Object.keys(groupedData).length > 0) {

            for (const [plantCode, employees] of Object.entries(groupedData)) {
                //logString = logString + ReturnConstants().Mahapass.totalplantRecord + employees.length + "\n";
                var fileString = ReturnConstants().Mahapass.mahaPassInitialString;
                for (let employeeItem of employees) {
                    fileString = fileString + "\r\n";
                    fileString = fileString + ReturnConstants().Mahapass.mahaPassEmpCodeNumber + employeeItem.EMPCODE + "\r\n";
                    fileString = fileString + ReturnConstants().Mahapass.mahaPassEmpNameEnglish + employeeItem.EMPNAMEENGLISH + "\r\n";
                    fileString = fileString + ReturnConstants().Mahapass.mahaPassPassword + employeeItem.MAHAPASSWORD + "\r\n";
                    fileString = fileString + ReturnConstants().Mahapass.mahaPassDefault;
                }
                fileString = fileString + "\r\n" + ReturnConstants().Mahapass.mahaPassEndString;

                var buffer = Buffer.from(fileString, 'utf-8');
                var sBase64Content = buffer.toString('base64');
                var cPayload = {
                    "Site_no": plantCode,
                    "File_name": ReturnConstants().Mahapass.mahaPassLogFileNamePrefix + plantCode + ReturnConstants().Mahapass.mahaPassLogFileNameExt,
                    "File_Content": sBase64Content,
                    "fileUploadPath": ""
                };
                var validation = validateMahaPwdPayload(cPayload);
                if (validation === true) {

                    //logString = logString + ReturnConstants().Mahapass.mahaPassLogFileValidPayloadMsg + JSON.stringify(cPayload) + " \n";

                    try {
                        var responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cSendPwdFileFromBtpToSap, cPayload);

                        //logString = logString + ReturnConstants().Mahapass.mahaPassLogApiResponseText + JSON.stringify(responseAutoConfig) + " \n";

                        if (responseAutoConfig.responseStatus.statusCode == ReturnConstants().Mahapass.statusCode) {

                            //logString = logString + ReturnConstants().Mahapass.mahaPassLogExcutedSuccessMsg;
                            var objMAHAPassLog = {
                                mahaPassLog: cds.utils.uuid(),
                                sitecode: plantCode,
                                filename: ReturnConstants().Mahapass.mahaPassLogFileNamePrefix + plantCode + ReturnConstants().Mahapass.mahaPassLogFileNameExt,
                                fileSentOn: getFormattedDate(),
                                isSentMaha: true,
                                errorDesc: ''
                            }
                            await INSERT.into(MAHAPassLog).entries(objMAHAPassLog);
                        } else {

                            //logString = logString + ReturnConstants().Mahapass.mahaPassLogExcutedFailMsg + JSON.stringify(responseAutoConfig.responseStatus.errorDetails) + " \n";

                            var objMAHAPassLog = {
                                mahaPassLog: cds.utils.uuid(),
                                sitecode: plantCode,
                                filename: ReturnConstants().Mahapass.mahaPassLogFileNamePrefix + plantCode + ReturnConstants().Mahapass.mahaPassLogFileNameExt,
                                fileSentOn: getFormattedDate(),
                                isSentMaha: false,
                                errorDesc: ReturnConstants().cGeneralError.cForPayload + JSON.stringify(cPayload) + ReturnConstants().cGeneralError.cPayloadErrorResponse + JSON.stringify(responseAutoConfig.responseStatus.errorDetails)
                            }
                            await INSERT.into(MAHAPassLog).entries(objMAHAPassLog);

                        }
                    } catch (err) {
                        //logString = logString + ReturnConstants().Mahapass.mahaPassLogExcutedFailMsg + JSON.stringify(err.reason.response.body.responseStatus.errorDetails[0].message) + " \n";
                        var objMAHAPassLog = {
                            mahaPassLog: cds.utils.uuid(),
                            sitecode: plantCode,
                            filename: ReturnConstants().Mahapass.mahaPassLogFileNamePrefix + plantCode + ReturnConstants().Mahapass.mahaPassLogFileNameExt,
                            fileSentOn: getFormattedDate(),
                            isSentMaha: false,
                            errorDesc: ReturnConstants().cGeneralError.cForPayload + JSON.stringify(cPayload) + ReturnConstants().cGeneralError.cPayloadErrorResponse + JSON.stringify(err.reason.response.body.responseStatus.errorDetails[0].message)
                        }
                        await INSERT.into(MAHAPassLog).entries(objMAHAPassLog);

                    }
                } else {
                    //logString = logString + ReturnConstants().Mahapass.mahaPassLogInvalidPayloadMsg + JSON.stringify(cPayload) + "\n";
                    //logString = logString + ReturnConstants().Mahapass.mahaPassLogpayloadValidationMsg + validation + "\n";
                }
            }
        }

        //var textFileName = ReturnConstants().cMahaPWDLogfile.cLogFilename + new Date().toISOString() + ".txt";
        //logString = logString + ReturnConstants().Mahapass.logFileNameString + textFileName + '\n';

        //logString = logString + '\n****************************' + ReturnConstants().Mahapass.mahaPassLogFileExecutionEndMsg + getCurrentDateTimeString() + '****************************\n';
        //await createLogFileOnDMSFunc(logString, textFileName);
        return result.length + ReturnConstants().Notification.recordProcessed;

    }
    service.on('mahaSendPwdFile', async (req) => {
        return await mahaSendPwdFileFunc();
    })

    function validateMahaPwdPayload(payloadData) {
        var error = '';
        if (payloadData.Site_no == '' || payloadData.Site_no == null) {
            error = error + ReturnConstants().cValidateMahaPwdPayload.cSiteNo + payloadData.Site_no + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.File_name == '' || payloadData.File_name == null) {
            error = error + ReturnConstants().cValidateMahaPwdPayload.cFileName + payloadData.File_name + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadData.File_Content == '' || payloadData.File_Content == null) {
            error = error + ReturnConstants().cValidateMahaPwdPayload.cFileContent + payloadData.File_Content + ReturnConstants().cGeneralError.cInvalid;
        }
        if (error == '') {
            return true;
        } else {
            return "\nFor Payload = " + JSON.stringify(payloadData) + "\nErrors as = " + error;
        }
    }
    /***********************************************************
        *Method to use For fetching side center according to login user 
    ***********************************************************/
    service.on('FetchSideCenter', async (req) => {
        try {
            const { PlantCode } = req.data;
            const sUpperPlantCode = PlantCode.toUpperCase();
            const aCenterSideData = `${ReturnConstants().cProcedures.cGetCenterSide} ('${sUpperPlantCode}', RETURNDATA => ?)`;
            const oResult = await cds.db.run(aCenterSideData);
            return oResult.RETURNDATA;
        } catch (error) {
            req.error(ReturnConstants().ErrorCode.InternalServer, 'ERRORFETCHSIDECENTER' + error.message);
        }
    });

    service.on('GetDataFromITCForCertificateInfo', async (req) => {
        try {
            const { Payload } = req.data;
            Payload.btpApp = ReturnConstants().itcConstants.cBtpApp;
            var oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            var aITCCertificateData = await oConnectionPost.post(ReturnConstants().destinationCLM.cCertificateInfo, Payload);
            return aITCCertificateData;
        } catch (error) {
            throw req.error('ERRORINGETDATAFROMITCFORCERTIFICATEINFO' + error.message)
        }
    });

    service.on('GetDataFromITCForCustomsCertificate', async (req) => {
        try {
            const { Payload } = req.data;
            Payload.btpApp = ReturnConstants().itcConstants.cBtpApp;
            var oConnectionPost = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            var aITCCertificateData = await oConnectionPost.post(ReturnConstants().destinationCLM.cGetCustomsCert, Payload);
            return aITCCertificateData;
        } catch (error) {
            throw req.error('ERRORINGETDATAFROMITCFORCUSTOMSCERTIFICATE' + error.message)
        }
    });

    /**********************************************************
    Function to flattened the Order data required to Sync order
    ************************************************************/
    async function createSyncOrderPayload(order, serviceRequestNo) {
        const oPaymentQuery = SELECT
            .from(PaymentDocs)
            .where({ orderNumber: serviceRequestNo })
            .columns(a => {
                a('*')
                a.items('*')
            });
        const aPaymentResult = await cds.tx(async tx => await tx.run(oPaymentQuery));

        const docDate = `/Date(${new Date(order.orderDate).getTime()})/`;
        let currentdate = new Date();

        //console.log("OrderCreatedByCode = ", order.orderCreatedByCode)
        //console.log("inspectionByCode = ", order.VehOrdInspDetails[0].vehOrdInspLines[0].inspectionByCode)
        var employeeDeatils = await SELECT.one.from(EmployeeMaster).where({
            empCode: order.orderCreatedByCode
        });

        /*if (order.VehOrdInspDetails[0].vehOrdInspLines[0].inspectionByCode != null) {
            var employeeDeatils = await SELECT.one.from(EmployeeMaster).where({
                empCode: order.VehOrdInspDetails[0].vehOrdInspLines[0].inspectionByCode
                //empCode: order.OrderCreatedByCode
            });
        }*/

        let hasNC = (order.VehOrdInspDetails || []).some(detail => (detail.vehOrdInspLines || []).some(line => line.LineIndicator === 'NC'));

        //console.log('hasNC = ', hasNC)
        var headerIndicator = order.s4Indicator;
        if (order.orderSyncDate != null) {
            if (hasNC == true) {
                headerIndicator = ReturnConstants().cS4SyncOrderFromBtpToHana.cHeaderUpdateCreateIndicator;
            } else {
                headerIndicator = ReturnConstants().cS4SyncOrderFromBtpToHana.cHeaderUpdateIndicator;
            }

        }

        // Prepare SOHeader
        const SOHeader = {
            CustomerNumber: order.customerCode?.customerNo || "",// "5000009927",
            Order: order.serviceRequestNo || "",
            DocType: order.orderType || "", // || "ZVSO", need to handle scenarion based in order type            
            Indicator: headerIndicator || "",
            SalesOrg: order.salesOrganization || "",
            DistrChan: order.salesDivChnl || "",
            Division: order.division || "",
            Reqdeldate: order.orderDate || "",  //TBD is it same as order date need to confirm with kiran
            Potype: "",
            Email: order.customerCode?.emailAddress || "",
            Spyourref: "",     //(Use in retrun order)
            PurchNoC: order.serviceRequestNo || "",
            Shcustref: "",     //TBD
            Shyourref: "",
            DocDate: order.orderDate,
            Acntref: "",
            Assignment: "",
            PaymtMeth: "",
            Soldto: order.customerCode?.customerType === ReturnConstants().cS4SyncOrderFromBtpToHana.cIndividualCustomer ? order.customerCode.customerNo : "", //customer code   

            Shipto: order.customerCode?.customerType === ReturnConstants().cS4SyncOrderFromBtpToHana.cIndividualCustomer ? order.plantCode : "",
            //order.customerCode.firstName + order.customerCode.lastName, //payer in case of B2C //order.plantCode
            Moptyp1: aPaymentResult[0]?.items[0]?.mopCode || "",  //"ZVCA", GIVE ERROR
            Cardno1: aPaymentResult[0]?.items[0]?.cardNumber || "",
            Cardtyp1: aPaymentResult[0]?.items[0]?.cardName || "", //"VISA",
            Rrnno1: aPaymentResult[0]?.items[0]?.rrn || "",
            Authcd1: "",
            Custid1: order.customerCode?.customerNo || "",//order.customerCode?.customerNo , TBD
            Custtyp1: order.customerCode?.customerType === ReturnConstants().cS4SyncOrderFromBtpToHana.cIndividualCustomer ? ReturnConstants().cS4SyncOrderFromBtpToHana.cB2cCustomer : ReturnConstants().cS4SyncOrderFromBtpToHana.cB2bCustomer,//"B2C",
            Amt1: aPaymentResult[0]?.items[0]?.amount || "",// || "100.00",
            Utrnno1: order.paymentUTRNo || "", //"UTRN00000000000000000000000001", //TBD that for 1 Order Only 1 UTR
            Moptyp2: aPaymentResult[0]?.items[1]?.mopCode || "",
            Cardno2: aPaymentResult[0]?.items[1]?.cardNumber || "",
            Cardtyp2: aPaymentResult[0]?.items[1]?.cardName || "",
            Rrnno2: aPaymentResult[0]?.items[1]?.rrn || "",
            Authcd2: "",
            Custid2: order.customerCode?.customerNo || "", // order.customerCode?.customerNo 
            Custtyp2: "",
            Amt2: aPaymentResult[0]?.items[1]?.amount || "",
            Utrnno2: "",
            Moptyp3: aPaymentResult[0]?.items[2]?.mopCode || "",
            Cardno3: aPaymentResult[0]?.items[2]?.cardNumber || "",
            Cardtyp3: aPaymentResult[0]?.items[2]?.cardName || "",
            Rrnno3: aPaymentResult[0]?.items[2]?.rrn || "",
            Authcd3: "",
            Custid3: order.customerCode?.customerNo || "", // order.customerCode?.customerNo 
            Custtyp3: "",
            Amt3: aPaymentResult[0]?.items[2]?.amount || "",
            Utrnno3: "",
            Moptyp4: aPaymentResult[0]?.items[3]?.mopCode || "",
            Cardno4: aPaymentResult[0]?.items[3]?.cardNumber || "",
            Cardtyp4: aPaymentResult[0]?.items[3]?.cardName || "",
            Rrnno4: aPaymentResult[0]?.items[3]?.rrn || "",
            Authcd4: "",
            Custid4: order.customerCode?.customerNo || "", // order.customerCode?.customerNo 
            Custtyp4: "",
            Amt4: aPaymentResult[0]?.items[3]?.amount || "",
            Utrnno4: "",

            Bussdate: order.runningBusinessDate, //On the basis of Shift get the Business Date.order.businessDate
            Shiftdetails: order.runningShiftName || ReturnConstants().cS4SyncOrderFromBtpToHana.cDayShift,
            Shiftfrmtime: order.shiftFromTime || "",
            Shifttotime: order.shiftToTime || "",
            //Empcode: order.VehOrdInspDetails[0].inspectionByUser,
            Empcode: order.VehOrdInspDetails[0].vehOrdInspLines[0].inspectionByCode,
            Empname: employeeDeatils?.empNameEnglish ?? "",
            Emirate: employeeDeatils?.empEmiratesId ?? "",
            //Custtype: order.customerCode.customerType || "",//empty //b2c or b2b
            Custtype: order.customerCode?.customerType === ReturnConstants().cSyncOrderValidation.cCustomerTypeInd ? ReturnConstants().cSyncOrderValidation.cCustomerTypeB2C : ReturnConstants().cSyncOrderValidation.cCustomerTypeB2B,//"B2C",,//empty //b2c or b2b
            Lanetyp: order.VehOrdInspDetails[0].laneTypeCode || "",//order.VehOrdInspDetails[0].laneCode
            Outstandbal: "",
            Advamt: "",
            Videocalurl: "",
            Ngvcust: "",
            Deliveryno: order.s4DeliveryNo || "",
            Invoiceno: order.orderReferenceNo || "",
            Items: {
                SOItems: []
            },
            Attachments: {
                SOAttachments: [
                    {
                        FileName: "",
                        Description: "",
                        Attachment: ""
                    },
                    {
                        FileName: "",
                        Description: "",
                        Attachment: ""
                    }
                ]
            }
        };


        for (const detail of order.VehOrdInspDetails || []) {
            for (const line of detail.vehOrdInspLines || []) {

                const SOItem = {
                    Order: order.serviceRequestNo,
                    ItmNumber: String(line.orderLineNo || ''),
                    Indicator: String(line.LineIndicator || ''),
                    Material: String(line.materialCode || ''),
                    Plant: detail.plantCode || '',
                    StoreLoc: "",
                    TargetQty: line?.quantity,//|| "10",
                    TargetQu: line?.currencyCode,
                    PymtMeth: "", //empty
                    PartnRole: "",//empty
                    PartnNumb: "",//empty
                    PitmNumber: "",
                    ReqQty: line.quantity || '1',
                    Zzplateno: detail.VehicleDetails?.plateNumber,
                    Zzplatesource: (detail.VehicleDetails?.plateSourceCode + ", " + detail.VehicleDetails?.plateSourceEnglish).slice(0, 40),
                    Zzplatecolor: (detail.VehicleDetails?.plateColorCode + ", " + detail.VehicleDetails?.bodyColorEnglish).slice(0, 40),
                    Zzplatekind: (detail.VehicleDetails?.plateKindCode + ", " + detail.VehicleDetails?.plateKindEnglish).slice(0, 40),
                    Zzplatecode: detail.plateKind || "",
                    Zzurl: line?.lineLevelCertLink ? (line?.lineLevelCertLink).slice(0, 100) : "",
                    Zzoverallstatus: line.overallTestStatus || "",
                    ZzchasisNo: detail.VehicleDetails?.chasisNumber,
                    ZzengineNo: detail.VehicleDetails?.engineNumber,
                    Zznationality: detail.VehicleDetails?.nationalityCode + ", " + detail.VehicleDetails?.nationalityEnglish,
                    Zzmanufacturer: detail.VehicleDetails?.manfacturerCode + ", " + detail.VehicleDetails?.manfacturerEnglish,
                    Zzmodel: detail.VehicleDetails?.modelCode + ", " + detail.VehicleDetails?.modelEnglish,
                    ZzbodyColor: (detail.VehicleDetails?.bodyColorCode + ", " + detail.VehicleDetails?.bodyColorEnglish).slice(0, 40),
                    Zzlanenumber: detail.laneCode || "",
                    Zzvhtype: (detail.VehicleDetails?.typeCode + ", " + detail.VehicleDetails?.typeEnglish).slice(0, 25) || "",
                    Zzyear: detail.VehicleDetails?.registrationYear,
                    Zzsmssta: line.isDeliverySmsStatus === true ? ReturnConstants().cS4SyncOrderFromBtpToHana.cSmsSentText : "",
                    Zzkindcd: detail.plateKind || "",   //detail.plateKind or //GIVE ERROR WHEN GIVE VALUE   //detail.VehicleDetails?.kindCode + ", " + detail.VehicleDetails?.kindEnglish,
                    Zzshdldt: currentdate,//upated at
                    Zzshdltime: "",
                    Zzbooksite: "",
                    Zzreshdlgt: currentdate,
                    Zzvehclcat: "",
                    Zzconvoper: "",
                    Zztpinum: "",
                    ShipType: "",
                    ItemsCond: {
                        SOItemCond: []
                    }
                };
                //console.log('line.vehicleOrderInspectionPricing = ', line.vehicleOrderInspectionPricing);
                for (const itmCond of line.vehicleOrderInspectionPricing) {
                    const SOItemCond = {
                        Order: order.serviceRequestNo,
                        ItmNumber: String(line.orderLineNo),
                        CondType: itmCond.condType,
                        CondValue: itmCond.condValue,
                        Currency: line.currencyCode
                    }

                    SOItem.ItemsCond.SOItemCond.push(SOItemCond);
                }

                SOHeader.Items.SOItems.push(SOItem);
            }
        }

        return {
            SOHeaderSet: {
                SOHeader
            }
        };
    }

    /**********************************************************
    Function to validate the payload
    ************************************************************/
    function payloadValidationForCreateOrderInS4(payload) {
        let error = '';
        const header = payload?.SOHeaderSet?.SOHeader;

        if (!header) {
            return ReturnConstants().cSyncOrderValidation.cHeaderMissing;
        }

        function isBlank(value) {
            return value === null || value === undefined || value === '';
        }

        // Header-level validations
        if (isBlank(header.CustomerNumber)) {
            error += ReturnConstants().cSyncOrderValidation.cCustomerMissing;
        }
        if (isBlank(header.Empname)) {
            error += ReturnConstants().cSyncOrderValidation.cEmpNameMissing;
        }
        if (isBlank(header.Emirate)) {
            error += ReturnConstants().cSyncOrderValidation.cEmiratesMissing;
        }
        if (isBlank(header.Order)) {
            error += ReturnConstants().cSyncOrderValidation.cOrderMissing;
        }

        if (isBlank(header.Email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(header.Email)) {
            error += ReturnConstants().cSyncOrderValidation.cEmailMissing;
        }

        // Items-level validations
        const items = header.Items?.SOItems || [];
        if (items.length === 0) {
            error += ReturnConstants().cSyncOrderValidation.cSoItemMissing;
        } else {
            items.forEach((item, idx) => {
                if (isBlank(item.Material)) {
                    error += ReturnConstants().cSyncOrderValidation.cSoItemText + ` [${idx}] ` + ReturnConstants().cSyncOrderValidation.cMeterialMissing;
                }

                if (isBlank(item.Zzplateno)) {
                    error += ReturnConstants().cSyncOrderValidation.cSoItemText + `[${idx}] ` + ReturnConstants().cSyncOrderValidation.cPlateNumMissing;
                }
                if (isBlank(item.ZzchasisNo)) {
                    error += ReturnConstants().cSyncOrderValidation.cSoItemText + `[${idx}] ` + ReturnConstants().cSyncOrderValidation.cChasisNumMissing;
                }
                if (isBlank(item.ZzengineNo)) {
                    error += ReturnConstants().cSyncOrderValidation.cSoItemText + `[${idx}] ` + ReturnConstants().cSyncOrderValidation.cEngineNumMissing;
                }

                const conditions = item.ItemsCond?.SOItemCond || [];
                conditions.forEach((cond, cIdx) => {
                    if (isBlank(cond.CondType)) {
                        error += ReturnConstants().cSyncOrderValidation.cSoItemText + `[${idx}].Cond[${cIdx}] ` + ReturnConstants().cSyncOrderValidation.cCondTypeMissing;
                    }

                    if (isBlank(cond.CondValue) || isNaN(cond.CondValue)) {
                        error += ReturnConstants().cSyncOrderValidation.cSoItemText + `[${idx}].Cond[${cIdx}] ` + ReturnConstants().cSyncOrderValidation.cCondValueMissing;
                    }
                });
            });
        }

        //This validation is commented in devlopmet phase as it will change in future with differnet logic

        // Attachments validation 
        // const attachments = header.Attachments?.SOAttachments || [];
        // attachments.forEach((att, idx) => {
        //     const hasAttachment = !isBlank(att.Attachment);
        //     const isFileNameBlank = isBlank(att.FileName);
        //     const isDescBlank = isBlank(att.Description);

        //     if (hasAttachment && (isFileNameBlank || isDescBlank)) {
        //         error += ` Attachment[${idx}] FileName/Description is missing or blank when Attachment is present.`;
        //     }
        // });

        // Final return
        return error === ''
            ? ReturnConstants().cS4SyncOrderFromBtpToHana.cPayloadValidationSuccess
            : ReturnConstants().cSyncOrderValidation.cInvalidPayload + error + "\n";
    }
    /**********************************************************
       Function to get customer Data by customer id
       ************************************************************/

    async function isCoustomerSynced(sCustomerUUID) {
        let oCustomerDetail = await SELECT.one.from(CustomerMasters).where({
            customerUUID: sCustomerUUID
        });
        return oCustomerDetail;
    }
    /**************************************************************************************************************************
    Function to get Senario One Data for Order from BTP to S4Hana . It will run multiple times in a single day(in every 15 min)
    ***************************************************************************************************************************/
    async function getSenarioOneData() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let currentDate = now.toISOString().replace('T', ' ').split('.')[0];
        const oQuery = SELECT
            .from(VehicleOrderInspections)
            .where({
                orderSyncedS4: false,
                runningBusinessDate: currentDate,
                orderType: { in: ['ZVSO', 'ZVOO'] }

            })
            .columns(a => {
                a('*');
                a.customerCode('*');
                a.VehOrdInspDetails(b => {
                    b('*');
                    b.VehicleDetails('*');
                    b.vehOrdInspLines(l => {
                        l('*');
                        l.vehicleOrderInspectionPricing(m => {
                            m('*')
                        })
                    }).where({ acknowledgementNo: { '!=': null } });
                });
            });

        const aResult = await cds.tx(async tx => await tx.run(oQuery));
        return aResult;
    }

    /***********************************************************************************************
    Function to get Senario Two Data for Order from BTP to S4Hana . It will run once in a single day
    ************************************************************************************************/

    async function getSenarioTwoData() {
        const now = new Date();
        if (now.getHours() < 4) {
            now.setDate(now.getDate() - 1);
        }
        now.setHours(0, 0, 0, 0);
        let currentDate = now.toISOString().replace('T', ' ').split('.')[0];


        const oQuery = SELECT
            .from(VehicleOrderInspections)
            .where({ s4Indicator: 'N', orderSyncedS4: false, runningBusinessDate: currentDate, orderType: { in: ['ZVOS'] } })
            .columns(a => {
                a('*');
                a.customerCode('*');
                a.VehOrdInspDetails(b => {
                    b('*');
                    b.VehicleDetails('*');
                    b.vehOrdInspLines(l => {
                        l('*');
                        l.vehicleOrderInspectionPricing(m => {
                            m('*')
                        })
                    }).where({ acknowledgementNo: { '!=': null } });
                });
            });

        const aResult = await cds.tx(async tx => await tx.run(oQuery));
        return aResult;
    }
    /**********************************************************
    Job to sync Order from BTP to S4Hana
    ************************************************************/
    async function syncOrderBTPToS4hanaFunc(senario) {

        if (senario == 'one') {
            //geting the order type 'ZVSO', 'ZVOO' with sync status false. It will run multiple times in a single day(in every 15 min)

            var aResult = await getSenarioOneData();
        } else {
            //geting the order type 'ZVOS' with sync status false . It will run once in a single day
            var aResult = await getSenarioTwoData();
        }

        try {
            let logString = "****************************" + ReturnConstants().cS4SyncOrderFromBtpToHana.cExecutionStartMsg + getCurrentDateTimeString() + "**************************** \n";
            // getting Completed Orders
            const aGetServiceOrder = aResult;
            var responseOrders = [];
            if (aGetServiceOrder.length > 0) {
                for (let item of aGetServiceOrder) {
                    var orderSyncErrorLog = [];
                    let oOrderDetail = item;
                    // //Sync Customer 

                    let sCustomerUUID = oOrderDetail.customerCode_customerUUID;
                    var oCustomerDetail = oOrderDetail.customerCode;
                    if (oOrderDetail.customerCode != null) {

                        if (oCustomerDetail.isSynced == false || oCustomerDetail.isSynced == null) {
                            var obj = await syncCustomer(sCustomerUUID, oCustomerDetail, item.serviceRequestNo);

                            responseOrders.push([{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: obj }])
                            //need to get refreshed isSynced value for the customer
                            oCustomerDetail = await isCoustomerSynced(sCustomerUUID);
                        }

                        // Order Syncing start

                        try {
                            if (oCustomerDetail.isSynced == true && oOrderDetail.VehOrdInspDetails[0].vehOrdInspLines.length > 0) {
                                let sOrderSyncResponse = await syncOrder(oOrderDetail);
                                var obj = [{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: sOrderSyncResponse }];
                                responseOrders.push(obj);
                            } else {

                                var orderSyncTransactionLog = {
                                    ID: cds.utils.uuid(),
                                    orderNumber: oOrderDetail.serviceRequestNo,
                                    customerNumber: oOrderDetail.customerCode?.customerNo || "",
                                    orderSync: false,
                                    requestPayload: '',
                                    response: '',
                                    errorMessage: ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerNotSynced
                                };
                                await insertOrderSyncLog(orderSyncTransactionLog);
                                var obj = [{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerNotSynced }];
                                responseOrders.push(obj);
                            }

                        } catch (error) {

                            var orderSyncTransactionLog = {
                                ID: cds.utils.uuid(),
                                orderNumber: oOrderDetail.serviceRequestNo,
                                customerNumber: oOrderDetail.customerCode?.customerNo || "",
                                orderSync: false,
                                requestPayload: '',
                                response: '',
                                errorMessage: error.message
                            };
                            await insertOrderSyncLog(orderSyncTransactionLog);
                            var obj = [{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: error.message }];
                            responseOrders.push(obj);
                            //console.log('error.message = ', error.message)
                        }
                    } else {
                        responseOrders.push([{ serviceRequestNo: item.serviceRequestNo, msg: ReturnConstants().cS4SyncOrderFromBtpToHana.cNoCustomerFound }])
                    }

                }

            } else {
                logString = logString + ReturnConstants().cS4SyncOrderFromBtpToHana.cNoRecordFound;
                responseOrders.push(ReturnConstants().employeePasswordNotification.noRecordProcessed);
            }
            //console.log(logString)
            //console.log(JSON.stringify(responseOrders))

            return responseOrders;

        } catch (error) {
            //throw new Error(ReturnConstants().cCreateOrderLogfile.cSyncFailed);
            console.log(error);
            var orderSyncTransactionLog = {
                ID: cds.utils.uuid(),
                orderNumber: "",
                customerNumber: "",
                orderSync: false,
                requestPayload: '',
                response: '',
                errorMessage: error.message
            };
            await insertOrderSyncLog(orderSyncTransactionLog);
            //throw new Error(ReturnConstants().cCreateOrderLogfile.cSyncFailed);
        }
    }
    service.on('syncOrderBTPToS4hana', async (req) => {
        return await syncOrderBTPToS4hanaFunc(req.data.senario);
    });
    service.on('syncOrderBTPToS4hanaCron', async (req) => {
        return syncOrderBTPToS4hanaFunc(req.data.senario);
    });
    /**********************************************************
    RealTime user sync order syncSingleOrder
    ************************************************************/
    async function syncOrder(orderData) {
        let syncStatus = false;
        let errorMessage = '';
        try {
            const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            let payload = await createSyncOrderPayload(orderData, orderData.serviceRequestNo);

            const oValidatedPayload = payloadValidationForCreateOrderInS4(payload);
            if (oValidatedPayload == ReturnConstants().cSyncOrderValidation.cPayloadValidationSuccess) {
                try {
                    //if (orderData.s4DeliveryNo == null && orderData.orderReferenceNo == null) { previous logic
                    if (orderData.orderSyncDate == null) {
                        console.log('create') //for testing pupose
                        try {
                            console.log('here try');//for testing pupose
                            var responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cCreateOrderFromBtpToSap, payload);
                            let orderStatus = orderData.orderStatus;
                            if (orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cCompleteHeaderStatus || orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cUpdateHeaderStatus) {
                                //orderStatus = 'FREEZED'
                                orderStatus = ReturnConstants().cSyncOrderValidation.cOrderStatusFreezed;
                            }
                            let response = responseAutoConfig.SOHeaderSet?.SOHeader ?? null;
                            var cInvoiceno = responseAutoConfig.SOHeaderSet?.SOHeader?.Invoiceno ?? null;
                            var cDeliveryno = responseAutoConfig.SOHeaderSet?.SOHeader?.Deliveryno ?? null;

                            var isSync = await UPDATE(VehicleOrderInspections)
                                .set({
                                    orderSyncedS4: true,
                                    orderStatus: orderStatus,
                                    s4DeliveryNo: cDeliveryno,
                                    orderReferenceNo: cInvoiceno,
                                    orderSyncDate: new Date(),
                                    orderSyncedMessage: ReturnConstants().cSyncOrderValidation.cDBSyncedMsg
                                })
                                .where({ serviceRequestNo: orderData.serviceRequestNo });

                            var orderSyncTransactionLog = {
                                ID: cds.utils.uuid(),
                                orderNumber: orderData.serviceRequestNo,
                                customerNumber: orderData.customerCode?.customerNo || "",
                                orderSync: true,
                                requestPayload: JSON.stringify(payload),
                                response: JSON.stringify(responseAutoConfig),
                                errorMessage: ''
                            };
                            await INSERT.into(orderSyncLog).entries(orderSyncTransactionLog);
                            return { syncStatus: true, errorMessage: '' };
                        } catch (error) {
                            console.log('here catch');

                            var orderSyncTransactionLog = {
                                ID: cds.utils.uuid(),
                                orderNumber: orderData.serviceRequestNo,
                                customerNumber: orderData.customerCode?.customerNo || "",
                                orderSync: false,
                                requestPayload: '',
                                response: '',
                                errorMessage: JSON.stringify(error)
                            };
                            errorMessage = error.message
                            await INSERT.into(orderSyncLog).entries(orderSyncTransactionLog);

                            return { syncStatus: false, errorMessage: errorMessage };
                        }

                    } else {
                        console.log('update') //for testing pupose     
                        let orderStatus = orderData.orderStatus;
                        if (orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cCompleteHeaderStatus || orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cUpdateHeaderStatus) {
                            //orderStatus = 'FREEZED'
                            orderStatus = ReturnConstants().cSyncOrderValidation.cOrderStatusFreezed;
                        }
                        var responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cUpdateOrderFromBtpToSap, payload);
                        var isSync = await UPDATE(VehicleOrderInspections)
                            .set({
                                orderStatus: orderStatus,
                                s4Indicator: payload.SOHeaderSet.SOHeader.Indicator,
                                orderSyncedS4: true, orderSyncDate: new Date(),
                                orderSyncedMessage: ReturnConstants().cSyncOrderValidation.cDBSyncedMsg
                            })
                            .where({ serviceRequestNo: orderData.serviceRequestNo });
                        syncStatus = true;

                    }
                    if (responseAutoConfig) {

                        var orderSyncTransactionLog = {
                            ID: cds.utils.uuid(),
                            orderNumber: orderData.serviceRequestNo,
                            customerNumber: orderData.customerCode?.customerNo || "",
                            orderSync: true,
                            requestPayload: JSON.stringify(payload),
                            response: JSON.stringify(responseAutoConfig),
                            errorMessage: ''
                        };
                        await insertOrderSyncLog(orderSyncTransactionLog);
                        return { syncStatus: true, errorMessage: '' };
                    }
                } catch (error) {

                    var orderSyncTransactionLog = {
                        ID: cds.utils.uuid(),
                        orderNumber: orderData.serviceRequestNo,
                        customerNumber: orderData.customerCode?.customerNo || "",
                        orderSync: false,
                        requestPayload: JSON.stringify(payload),
                        response: JSON.stringify(error.response),
                        errorMessage: error.message
                    };
                    errorMessage = error.message
                    await insertOrderSyncLog(orderSyncTransactionLog);
                    return { syncStatus: false, errorMessage: errorMessage };

                }
            }
            else {

                var orderSyncTransactionLog = {
                    ID: cds.utils.uuid(),
                    orderNumber: orderData.serviceRequestNo,
                    customerNumber: orderData.customerCode?.customerNo || "",
                    orderSync: false,
                    requestPayload: JSON.stringify(payload),
                    response: ReturnConstants().cS4SyncOrderFromBtpToHana.cInvalidOrderPayload + oValidatedPayload + "\n",
                    errorMessage: oValidatedPayload
                };
                await insertOrderSyncLog(orderSyncTransactionLog);
                errorMessage = oValidatedPayload
                return { syncStatus: false, errorMessage: errorMessage };
            }

            return { syncStatus: syncStatus, errorMessage: errorMessage };


        } catch (err) {

            //throw new Error(ReturnConstants().cS4SyncOrderFromBtpToHana.cOrderSynFailed, err);
            var orderSyncTransactionLog = {
                ID: cds.utils.uuid(),
                orderNumber: orderData.serviceRequestNo,
                customerNumber: orderData.customerCode?.customerNo || "",
                orderSync: false,
                requestPayload: '',
                response: '',
                errorMessage: err.message
            };

            await insertOrderSyncLog(orderSyncTransactionLog);
            return { syncStatus: false, errorMessage: err };
        }

    };
    async function insertOrderSyncLog(obj) {
        return await INSERT.into(orderSyncLog).entries(obj);
    }
    /**********************************************************
    RealTime user sync Customer syncCustomer
    ************************************************************/
    async function syncCustomer(customerUUID, oCustomerDetail, serviceRequestNo) {
        let sCustomerUUID = customerUUID;
        let logString = ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerSynStart;
        const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
        let result = oCustomerDetail;
        if (result != null || result != undefined) {
            var payload = {
                "CustomerSet": {
                    "Customer": {
                        "CustomerNumber": result.customerNo ? result.customerNo : null,//mandatory
                        "CustomerCategory": "2",//hard code as suggested
                        "BpGrouping": "ZBTC",//hard code as suggested 
                        "BpRole": "",//blank as suggested
                        "Partnertype": "",//blank as suggested
                        "Name1": result.firstName ? result.firstName : null,
                        "Name2": result.lastName ? result.lastName : null,
                        "Legalform": "10",//hard code as suggested
                        "Langu": "E",//hard code as suggested
                        "Street": "",//blank as suggested
                        "StrSuppl1": "",//blank as suggested
                        "HouseNo": "",//blank as suggested
                        "Searchterm1": result.searchTerm ? result.searchTerm : null,
                        "Searchterm2": "",//blank as suggested
                        "City": result.regionCode,
                        //"City": "ABU DHABI",//region code as suggested connect with Afshan will be treated as item.REGION
                        "Country": result.countryCode ? result.countryCode : "AE",// will be short code
                        "Region": result.regionCode,
                        //"Region": "AE",//region code as suggested connect with Afshan will be treated as item.REGION
                        "PostlCod1": "",//blank as suggested
                        "EMail": result.emailAddress ? result.emailAddress : null,//mandatory
                        "Extension": "",//blank as suggested
                        "Telephone": "",//blank as suggested
                        "Mobile": result.mobileNo ? result.mobileNo : null, //mandatory
                        "Nationality": result.regionCode,
                        "SalesOrg": result.salesOrganization ? result.salesOrganization : ReturnConstants().cS4SyncOrderFromBtpToHana.cDefaultSalesOrg,
                        "DistrChan": result.distributionChannel ? result.distributionChannel : ReturnConstants().cS4SyncOrderFromBtpToHana.cDefaultDistributionChannel,//hard code as suggested
                        "Division": "",//blank as suggested further implementation pending
                        "IdNo": result.emiratesId ? result.emiratesId : null,//Emirates ID No
                        "IdType": result.idType ? result.idType : ReturnConstants().cS4SyncOrderFromBtpToHana.cDefaultIdType,//it should be dynamic
                        "Validfromdate": result.emiratesFromDate ? formatISOToDateTimeString(result.emiratesFromDate) : new Date().toISOString(),//today's date //further implemetation will come //mandatory
                        "Validtodate": result.emiratesToDate ? formatISOToDateTimeString(result.emiratesToDate) : null //will come from ADD_VI_CUSTOMERMASTERS //mandatory
                    }
                }
            };

            var validation = payloadValidationForCreateCutomer(payload);
            if (validation == ReturnConstants().cCustomerNotification.cPayloadValidationSuccess) { // if validation is successfull
                try {
                    //calling the Customer Create API 
                    var responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cCreateCustomerFromBtpToSap, payload);
                    var resultApi = responseAutoConfig.CustomerSet.Customer ? responseAutoConfig.CustomerSet.Customer : null;
                    if (resultApi != null) {
                        //upadate ADD_VI_CUSTOMERMASTERS table
                        if (resultApi.Message1.includes(ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerApiResponseForCreatedSuccess1) || resultApi.Message1.includes(ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerApiResponseForCreatedSuccess2) || resultApi.Message1.includes(ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerApiResponseForCreatedSuccess3)) {

                            await UPDATE(CustomerMasters)
                                .set({ isSynced: true, customerSyncS4: ReturnConstants().cCustomerNotification.cCustomerSyncS4, customerSyncMessage: ReturnConstants().cCustomerNotification.cDBSyncedMsg, customerSyncDate: new Date().toISOString() })
                                .where({ customerUUID: sCustomerUUID })
                            return { syncStatus: true, errorMessage: '' };
                        }
                    } else {
                        var orderSyncTransactionLog = {
                            ID: cds.utils.uuid(),
                            orderNumber: '',
                            customerNumber: result.customerNo ? result.customerNo : null,
                            orderSync: false,
                            requestPayload: JSON.stringify(payload),
                            response: JSON.stringify(responseAutoConfig),
                            errorMessage: ReturnConstants().cCustomerNotification.cNoResponse
                        };
                        await insertOrderSyncLog(orderSyncTransactionLog);
                        return { syncStatus: false, errorMessage: ReturnConstants().cCustomerNotification.cNoResponse };
                    }
                }
                catch (error) {
                    var orderSyncTransactionLog = {
                        ID: cds.utils.uuid(),
                        orderNumber: serviceRequestNo,
                        customerNumber: result.customerNo ? result.customerNo : null,
                        orderSync: false,
                        requestPayload: JSON.stringify(payload),
                        response: '',
                        errorMessage: error.message
                    };
                    await insertOrderSyncLog(orderSyncTransactionLog);
                    return { syncStatus: false, errorMessage: error.message };
                }
            } else {
                var orderSyncTransactionLog = {
                    ID: cds.utils.uuid(),
                    orderNumber: serviceRequestNo,
                    customerNumber: result.customerNo ? result.customerNo : null,
                    orderSync: false,
                    requestPayload: JSON.stringify(payload),
                    response: JSON.stringify(responseAutoConfig),
                    errorMessage: ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerInvalidPayload + validation + "\n"
                };
                await insertOrderSyncLog(orderSyncTransactionLog);
                return { syncStatus: false, errorMessage: ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerInvalidPayload + validation };
            }

        }
        else {
            var orderSyncTransactionLog = {
                ID: cds.utils.uuid(),
                orderNumber: serviceRequestNo,
                customerNumber: result.customerNo ? result.customerNo : null,
                orderSync: false,
                requestPayload: JSON.stringify(payload),
                response: JSON.stringify(responseAutoConfig),
                errorMessage: ReturnConstants().cS4SyncOrderFromBtpToHana.cNoCustomerFound
            };
            await insertOrderSyncLog(orderSyncTransactionLog);
        }

    }

    service.on('syncSingleCustomerOrder', async (req) => {
        try {
            //    let orderSync = await syncSingleOrder(req.data.serviceRequestNo)
            //    let customerSync = await syncSingleCustomer(req.data.serviceRequestNo)
            let customerSync = await realTimeCustomerOrderSyncToS4(req.data.serviceRequestNo)
            return customerSync;
        } catch (err) {
            console.error('CRITICALERRORINSYNCORDERBTPTOS4HANAHANDLER', err);
            throw req.error('FAILEDTOSYNCORDERS', err.message);
        }
    });

    async function updateLogosInXml(xmlData, jsonData) {
        try {
            // Input validation
            if (!xmlData || typeof xmlData !== ReturnConstants().cUpdateLogos.cString) {
                throw new Error('XMLDATAMUSTBEANONEMPTYSTRING');
            }

            if (jsonData !== null && (typeof jsonData !== ReturnConstants().cUpdateLogos.cObject || Array.isArray(jsonData))) {
                throw new Error('JSONDATAMUSTBEANOBJECTORNULL');
            }

            let aLogodata = [];

            // sample configuration with validation
            const oSampleJSONData = {
                "ADNOC_LOGO": {
                    "logoType": "ADNOC LOGO",
                    "type": "COMMON",
                    "emiratesCode": ""
                },
                "ESMA_LOGO": {
                    "logoType": "ESMA LOGO",
                    "type": "SERVICE WISE",
                    "emiratesCode": "2000030"
                },
                "POLICE_LOGO": {
                    "logoType": "POLICE LOGO",
                    "type": "EMIRATE WISE",
                    "emiratesCode": "AE"
                },
                "CARBON_FOOTPRINT": {
                    "logoType": "CARBON FOOTPRINT",
                    "type": "HEADER CERTIFICATE",
                    "emiratesCode": ""
                }
            };

            jsonData = jsonData;

            // Validate jsonData structure
            if (Object.keys(jsonData).length === 0) {
                console.warn(ReturnConstants().cUpdateLogos.cJsonDataEmpty);
                return xmlData;
            }

            // Validate each entry in jsonData
            for (let key in jsonData) {
                if (!jsonData.hasOwnProperty(key)) continue;

                // Validate key
                if (!key || typeof key !== ReturnConstants().cUpdateLogos.cString || key.trim() === '') {
                    console.warn(ReturnConstants().cUpdateLogos.cInvalidKeyFound + key, ReturnConstants().cUpdateLogos.cSkipping);
                    continue;
                }

                let value = jsonData[key];

                // Validate value structure
                if (!value || typeof value !== ReturnConstants().cUpdateLogos.cObject || Array.isArray(value)) {
                    console.warn(ReturnConstants().cUpdateLogos.cInvalidValue + key + ReturnConstants().cUpdateLogos.cMustBeAnObject);
                    continue;
                }

                // Validate required fields
                if (!value.logoType || typeof value.logoType !== ReturnConstants().cUpdateLogos.cString || value.logoType.trim() === '') {
                    console.warn(ReturnConstants().cUpdateLogos.cMissingOrInvalidLogoType + key, ReturnConstants().cUpdateLogos.cSkipping);
                    continue;
                }

                if (!value.type || typeof value.type !== ReturnConstants().cUpdateLogos.cString || value.type.trim() === '') {
                    console.warn(ReturnConstants().cUpdateLogos.cMissingOrInvalidType + key, ReturnConstants().cUpdateLogos.cSkipping);
                    continue;
                }

                // Validate emiratesCode (can be empty string)
                if (value.emiratesCode !== undefined && typeof value.emiratesCode !== ReturnConstants().cUpdateLogos.cString) {
                    console.warn(ReturnConstants().cUpdateLogos.cInvalidEmiratesCode + key + ReturnConstants().cUpdateLogos.cMustBeAString);
                    continue;
                }

                console.log(ReturnConstants().cUpdateLogos.cProcessing + key);
                console.log(ReturnConstants().cUpdateLogos.cValue, value);

                try {
                    // Build conditions array with validation
                    let conditions = [
                        ["status", "=", "X"],
                        ["deletionIndicator", "!=", "X"]
                    ];

                    // Add logoType condition
                    conditions.push([ReturnConstants().cUpdateLogos.cLogoType, "=", value.logoType.trim()]);

                    // Add type condition
                    conditions.push([ReturnConstants().cUpdateLogos.cType, "=", value.type.trim()]);

                    // Add emiratesCode condition only if not empty
                    if (value.emiratesCode && value.emiratesCode.trim() !== '') {
                        conditions.push([ReturnConstants().cUpdateLogos.cEmiratesCode, "=", value.emiratesCode.trim()]);
                    }

                    // Validate getDataFromTable function exists
                    if (typeof getDataFromTable !== ReturnConstants().cUpdateLogos.cFunction) {
                        throw new Error('GETDATAFROMTABLEFUNCTIONISNOTAVAILABLE');
                    }

                    // Call getDataFromTable with validation
                    let result = await getDataFromTable({
                        tableName: ReturnConstants().cUpdateLogos.cLogoMasters,
                        conditions: conditions,
                        columns: ["filedata", "logoType"]
                    });

                    // Validate result
                    if (!result) {
                        console.warn(ReturnConstants().cUpdateLogos.cNoResultReturned + key);
                        continue;
                    }

                    if (!Array.isArray(result)) {
                        console.warn(ReturnConstants().cUpdateLogos.cInvalidResultFormat + key + ReturnConstants().cUpdateLogos.cExpectedArray);
                        continue;
                    }

                    if (result.length === 0) {
                        console.warn(ReturnConstants().cUpdateLogos.cNoDataFound + key);
                        continue;
                    }

                    // Validate first result item
                    const firstResult = result[0];
                    if (!firstResult || typeof firstResult !== ReturnConstants().cUpdateLogos.cObject) {
                        console.warn(ReturnConstants().cUpdateLogos.cInvalidResultData + key + ReturnConstants().cUpdateLogos.cExpectedObject);
                        continue;
                    }

                    // Validate required fields in result
                    if (!firstResult.filedata || typeof firstResult.filedata !== ReturnConstants().cUpdateLogos.cString) {
                        console.warn(ReturnConstants().cUpdateLogos.cMissingOrInvalidFiledata + key);
                        continue;
                    }

                    // Validate filedata is not empty and appears to be valid data
                    if (firstResult.filedata.trim() === '') {
                        console.warn(ReturnConstants().cUpdateLogos.cEmptyFiledata + key);
                        continue;
                    }

                    // Add validated result to logodata
                    firstResult.logoType = key;
                    aLogodata.push(firstResult);
                    console.log(ReturnConstants().cUpdateLogos.cSuccessfullyProcessed + key);

                } catch (error) {
                    console.error(ReturnConstants().cUpdateLogos.cErrorProcessing + key, error.message);
                    // Continue processing other items instead of failing completely
                    continue;
                }
            }

            // Validate logodata before XML generation
            if (aLogodata.length === 0) {
                console.warn('NOVALIDLOGODATAFOUNDRETURNINGORIGINALXML');
                return xmlData;
            }

            // Generate XML with validation
            const newLogos = aLogodata.map(({ logoType, filedata }) => {
                // Validate logoType for XML tag creation
                if (!logoType || typeof logoType !== ReturnConstants().cUpdateLogos.cString) {
                    console.warn('INVALIDLOGOTYPEFOUNDSKIPPING');
                    return '';
                }

                // Sanitize tag name - remove invalid characters and ensure valid XML tag format
                let tagName = logoType.replace(/[^a-zA-Z0-9\-\_\.]/g, '_');

                // Ensure tag name starts with letter or underscore
                if (!tagName.match(/^[a-zA-Z_]/)) {
                    tagName = '_' + tagName;
                }

                // Validate tag name length
                if (tagName.length > 100) {
                    console.warn(ReturnConstants().cUpdateLogos.cTagNameTooLong + logoType, ReturnConstants().cUpdateLogos.cTruncating);
                    tagName = tagName.substring(0, 100);
                }

                // Validate and escape filedata for XML
                if (!filedata || typeof filedata !== ReturnConstants().cUpdateLogos.cString) {
                    console.warn(ReturnConstants().cUpdateLogos.cInvalidFiledata + logoType, ReturnConstants().cUpdateLogos.cSkipping);
                    return '';
                }

                // Basic XML escaping for filedata
                const escapedFiledata = filedata
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');

                return `<${tagName}>${escapedFiledata}</${tagName}>`;
            }).filter(tag => tag !== ''); // Remove empty tags

            // Join all valid tags
            const newLogosXml = newLogos.join('');

            // Validate XML structure before replacement
            if (!xmlData.includes('<logos')) {
                console.warn('NOLOGOSSECTIONFOUNDINXMLAPPENDINGNEWLOGOSSECTION');
                // Optionally append logos section if not found
                return xmlData + `<logos>${newLogosXml}</logos>`;
            }

            // Find and replace <logos> section with validation
            const logosSectionRegex = /<logos[^>]*>[\s\S]*?<\/logos>/i;
            const match = xmlData.match(logosSectionRegex);

            if (!match) {
                console.warn('COULDNOTFINDCOMPLETELOGOSSECTIONINXML');
                return xmlData;
            }

            // Replace the logos section
            const updatedXml = xmlData.replace(
                logosSectionRegex,
                `<logos>${newLogosXml}</logos>`
            );

            // Validate the updated XML is not empty
            if (!updatedXml || updatedXml.trim() === '') {
                console.error('UPDATEDXMLISEMPTYRETURNINGORIGINALXML');
                return xmlData;
            }

          //  console.log(ReturnConstants().cUpdateLogos.cSuccessfullyUpdatedLogosSection + aLogodata.length + ReturnConstants().cUpdateLogos.cLogos);
            return updatedXml;

        } catch (error) {
            console.error(ReturnConstants().cUpdateLogos.cErrorMessage, error.message);

            // Enhanced error information
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                inputValid: typeof xmlData === ReturnConstants().cUpdateLogos.cString && xmlData.length > 0,
                jsonDataValid: jsonData === null || (typeof jsonData === ReturnConstants().cUpdateLogos.cObject && !Array.isArray(jsonData))
            };

            console.error(ReturnConstants().cUpdateLogos.cErrorDetails, errorDetails);

            // Return original XML instead of throwing to prevent complete failure
            console.warn('CRETURNINGORIGINALXMLDUETOERROR');
            return xmlData;
        }
    }


    /***********************************************************
      Method to fetch data from modified test Master
    ***********************************************************/
    service.on('fetchModifiedData', async (req) => {
        try {
            // fetch few columns from modified master data
            const apartialModifiedData = await SELECT.distinct
                .from(TestTypeMasters)
                .columns(
                    "testText",
                    "testTextNo",
                    "testMainTypeNo",
                    "testMainTypeTextEnglish",
                    "testMainTypeTextArabic",
                    "controlTypeValueLabel1",
                    "controlTypeValueLabel2",
                    "controlTypeValueLabel3",
                    "controlTypeValueLabel4",
                    "examinationMethodEnglish",
                    "examinationMethodArabic"
                )
                .where({
                    testText: ReturnConstants().cModifiedVehicle.cTestText,
                    testTextNo: ReturnConstants().cModifiedVehicle.cTestTextNo
                })
                .orderBy({ testMainTypeNo: ReturnConstants().fetchModifiedData.cOrderBy });
            if (!apartialModifiedData.length) {
                return req.error(404, ReturnConstants().cModifiedVehicle.cMessage);
            }

            // fetch all columns from modified master data
            const afullModifiedData = await SELECT.from(TestTypeMasters).where({ testText: ReturnConstants().cModifiedVehicle.cTestText, testTextNo: ReturnConstants().cModifiedVehicle.cTestTextNo }).orderBy({ testMainTypeNo: 'asc' });

            // fetch combinations for modified master data
            const aCombinationData = await SELECT.from(TestTypeCombinationMaster)

            let aResponseArray = [];
            apartialModifiedData.forEach(parent => {
                let aChildData = {};
                let testMainType = parent.testMainTypeTextEnglish;

                // form modified data result set - child level 1 (controlType information)
                let aModifiedDataControlInfo = [...new Set(afullModifiedData
                    .filter(row => row.testMainTypeTextEnglish === testMainType)
                    .map(row => JSON.stringify({
                        id: uuid(),
                        "testMainTypeNo": parent.testMainTypeNo,
                        "testMainTypeTextEnglish": parent.testMainTypeTextEnglish,
                        "testMainTypeTextArabic": parent.testMainTypeTextArabic,
                        "testSubTypeNo": row.testSubTypeNo,
                        "testSubTypeTextEnglish": row.testSubTypeTextEnglish,
                        "testSubTypeTextArabic": row.testSubTypeTextArabic,
                        "controlType1": row.controlType1,
                        "controlType2": row.controlType2,
                        "controlType3": row.controlType3,
                        "controlType4": row.controlType4,
                        "controlType5": row.controlType5,
                        "controlType6": row.controlType6,
                        "controlTypeValueLabel1": false,
                        "controlTypeValueLabel2": false,
                        "controlTypeValueLabel3": row.controlTypeValueLabel3,
                        "controlTypeValueLabel4": row.controlTypeValueLabel4,
                        "controlTypeValueLabel5": row.controlTypeValueLabel5,
                        "controlTypeValueLabel6": row.controlTypeValueLabel6,
                        "conditionalMappingMasterCode": row.conditionalMappingMasterCode,
                        "hasChildSelected": false,
                        "modifyStageCode": null,
                        "modifyStageDesc": null,
                        "isAttachment": false
                    }))
                )].map(str => JSON.parse(str)); // Convert back to objects

                // form modified data result set - child level 2 (combination information)                
                aModifiedDataControlInfo.forEach(testMasterRow => {
                    testMasterRow["ChildSubCategory"] = aCombinationData
                        .filter(comb => comb.testTypeKey === testMasterRow.conditionalMappingMasterCode)
                        .map(comb => ({
                            id: uuid(),
                            "testTypeMaster": comb.testTypeMaster_testTypeUUID,
                            "testTypeCombinationUUID": comb.testTypeCombinationUUID,
                            "testTypeNo": comb.testTypeNo,
                            "testTypeTextEnglish": comb.testTypeTextEnglish,
                            "testTypeTextArabic": comb.testTypeTextArabic,
                            'Selected': false

                        }));
                });

                aChildData['SubCategory'] = aModifiedDataControlInfo;

                // create a response dataset of complete modifed Data 
                let response = {
                    "testTextNo": parent.testTextNo,
                    "testText": parent.testText,
                    "testMainTypeNo": parent.testMainTypeNo,
                    "testMainType": testMainType,
                    "testMainTypeTextArabic": parent.testMainTypeTextArabic,
                    "controlTypeValueLabel1": parent.controlTypeValueLabel1,
                    "controlTypeValueLabel2": parent.controlTypeValueLabel2,
                    "controlTypeValueLabel3": parent.controlTypeValueLabel3,
                    "controlTypeValueLabel4": parent.controlTypeValueLabel4,
                    "examinationMethodEnglish": parent.examinationMethodEnglish,
                    "examinationMethodArabic": parent.examinationMethodArabic,
                    "isShowPended": false,
                    "comment": "",
                    ...aChildData
                };
                aResponseArray.push(response);
            });
            return { aResponseArray };
        }
        catch (error) {
            throw req.error(ReturnConstants().ErrorCode.InternalServer, 'ERRORMESSAGEFETCHINGMODIFIEDDAT' + error.message);
        }
    });
    /***********************************************************
     *  Method to insert data into emailNotificationHistory
     ***********************************************************/
    async function emailNotificationEntry(email, isDelivered, failureReason) {
        var objNotificationHistory = {
            ID: cds.utils.uuid(),
            scenarioType: ReturnConstants().employeePasswordNotification.scenarioType,
            emailContent: ReturnConstants().employeePasswordNotification.emailText,
            messageSentDate: getFormattedDate(),
            receipientEmail: email,
            isDelivered: isDelivered,
            failureReason: failureReason
        };
        //insertion into emailNotificationHistory
        await INSERT.into(emailNotificationHistory).entries(objNotificationHistory);
        return ReturnConstants().Notification.tableInsertionEmailNotificationTxt + JSON.stringify(objNotificationHistory) + " \n";

    }
    /***********************************************************
     *  Method to insert data into smsNotificationHistory
     ***********************************************************/
    async function smsNotificationEntry(mobileNumber, isDelivered, reminderSmsSent, failureReason) {
        var objNotificationHistory = {
            ID: cds.utils.uuid(),
            scenarioType: ReturnConstants().employeePasswordNotification.scenarioType,
            smsContent: ReturnConstants().ShorySms.expirySms,
            messageSentDate: getFormattedDate(),
            receipientMobile: mobileNumber,
            isDelivered: isDelivered,
            reminderSmsSent: reminderSmsSent,
            failureReason: failureReason
        };
        //insertion into smsNotificationHistory
        await INSERT.into(smsNotificationHistory).entries(objNotificationHistory);
        return ReturnConstants().ShorySmsPre.tableInsertionNotificationTxt + JSON.stringify(objNotificationHistory) + " \n";

    }
    async function employeePasswordNotificationFunc() {

        var logString = "****************************" + ReturnConstants().Notification.executionStartMsg + getCurrentDateTimeString() + "**************************** \n";

        try {
            let result = await cds.run(
                ReturnConstants().cProcedures.cGetEmployeesForPasswordExpire, [[]]
            );
            result = result.RESULT;

            var mobileNumbers = [];
            var emailToSend = [];
            var emailRecordProcessed = ReturnConstants().employeePasswordNotification.noRecordProcessed;
            var smsRecordProcessed = ReturnConstants().employeePasswordNotification.noRecordProcessed;
            logString = logString + ReturnConstants().Notification.totalRecordProcessed + result.length + ReturnConstants().Notification.dataFromCustMaster;

            for (let item of result) {
                var reminderSmsSent = false;
                var reminderEmailSent = false;
                if ((item.EMPEMAILADDRESS != '' || item.EMPEMAILADDRESS != null) && item.REMINDEREMAILSENT == 0) {
                    emailToSend.push(item.EMPEMAILADDRESS);
                    try {
                        logString = logString + ReturnConstants().Notification.emailSentToCustMaster + item.EMPEMAILADDRESS + "\n";
                        let responseEmail = await sendEmailFunc(item.EMPEMAILADDRESS, ReturnConstants().employeePasswordNotification.emailText, ReturnConstants().employeePasswordNotification.emailSubject);
                        logString = logString + ReturnConstants().Notification.responseApi + JSON.stringify(responseEmail) + " \n";
                        var isDelivered = true;
                        reminderEmailSent = true;
                        var failureReason = '';
                        logString = logString + await emailNotificationEntry(item.EMPEMAILADDRESS, isDelivered, failureReason);

                    } catch (error) {
                        var isDelivered = false
                        reminderEmailSent = false;
                        var failureReason = error;
                        logString = logString + await emailNotificationEntry(item.EMPEMAILADDRESS, isDelivered, failureReason);
                    }

                    /*await UPDATE(EmployeeMaster)
                        .set({ reminderEmailSent: reminderEmailSent })
                        .where({ empCode: item.EMPCODE });*/

                }
                if ((item.EMPMOBILENO != '' || item.EMPMOBILENO != null) && item.REMINDERSMSSENT == 0) {
                    mobileNumbers.push(item.EMPMOBILENO);
                    try {

                        logString = logString + ReturnConstants().Notification.smsSentToCustMaster + item.EMPMOBILENO + "\n";
                        let responseSms = await sendSMSFunc([item.EMPMOBILENO], ReturnConstants().ShorySms.expirySms);
                        var isDelivered = true
                        var reminderSmsSent = true;
                        var failureReason = '';
                        if (responseSms.data[0].status == ReturnConstants().ShorySms.errorStatus) {
                            isDelivered = false;
                            reminderSmsSent = false;
                            failureReason = responseSms.data[0].description;
                        }

                        logString = logString + ReturnConstants().Notification.responseApi + JSON.stringify(responseSms) + " \n";
                        logString = logString + await smsNotificationEntry(item.EMPMOBILENO, isDelivered, failureReason);

                    } catch (error) {
                        //console.log('error = ',error);
                        var isDelivered = false;
                        reminderSmsSent = false;
                        var failureReason = error;
                        logString = logString + await smsNotificationEntry(item.EMPMOBILENO, isDelivered, failureReason);
                    }

                    /*await UPDATE(EmployeeMaster)
                        .set({ reminderSmsSent: reminderSmsSent })
                        .where({ empCode: item.EMPCODE });*/

                }
            }
            var textFileName = ReturnConstants().Notification.cLogFilename + new Date().toISOString() + ".txt";
            logString = logString + ReturnConstants().Notification.logFileNameString + textFileName + '\n';
            logString = logString + '\n****************************' + ReturnConstants().Notification.executionEndMsg + getCurrentDateTimeString() + '****************************\n';
            await createLogFileOnDMSFunc(logString, textFileName);
            emailRecordProcessed = emailToSend.length + ReturnConstants().ShorySms.recordProcessed;
            smsRecordProcessed = mobileNumbers.length + ReturnConstants().ShorySms.recordProcessed;
            const returnObj = {
                "email": emailRecordProcessed,
                "sms": smsRecordProcessed
            };
            return returnObj;

        } catch (error) {
            return error.message;
        }
    }
    service.on('employeePasswordNotification', async (req) => {
        employeePasswordNotificationFunc();
    })

    /**********************************************************
    RealTime Customer and order syncing
    ************************************************************/
    /*async function realTimeCustomerOrderSyncToS4(serviceRequestNo) {
        try {
            let logString = "****************************Execution of the Order from BTP to S-4 Sync Activity Started at " + getCurrentDateTimeString() + "**************************** \n";
            logString += `Processing order no: ${serviceRequestNo}\n`
            let oOrderDetail = await SELECT.one.from(VehicleOrderInspections).where({
                serviceRequestNo: serviceRequestNo
            });

            // //Sync Customer 
            let sCustomerUUID = oOrderDetail.customerCode_customerUUID;
            let oCustomerDetail = await SELECT.one.from(CustomerMasters).where({
                customerUUID: sCustomerUUID
            });

            logString += `Customer Number: ${oCustomerDetail?.customerNo}\n`
            logString += `Customer Name: ${oCustomerDetail?.firstName} ${oCustomerDetail?.lastName}\n`
            // console.log("oCustomerDetail", oCustomerDetail)
            // return
            if (oCustomerDetail.isSynced == false) {
                logString += `customer IsSync: false\n`
                try {
                    logString += await syncSingleCustomer(sCustomerUUID);
                }
                catch (error) {
                    logString += `Order Response: ${error?.message || error}\n\n`
                }
                // let result = await syncSingleCustomer(sCustomerUUID); 
                // return result
            }
            else {
                logString += `customer IsSync: true\n`
                logString += "Initializing Customer Creation Activity\n"
                logString += `Customer Created: false \n`
                logString += `Customer Creation Error Message:\n`
                logString += `Customer Payload: \n`
                logString += `Customer Response: \n`
            }

            // Order Sync 
            try {
                let sOrderSyncResponse = await syncSingleOrder(serviceRequestNo);
                logString += sOrderSyncResponse;
                // console.log("sOrderSyncResponse",sOrderSyncResponse)
                // return sOrderSyncResponse

            } catch (innerErr) {
                console.error(`\n Error processing order sync serviceRequestNo: ${serviceRequestNo}`, innerErr);
                // continue;
            }

            logString = logString + '\n****************************Execution of the Order S-4 Sync Activity completed at ' + getCurrentDateTimeString() + '****************************\n';
            let textFileName = ReturnConstants().cCreateOrderLogfile.cLogFilename + new Date().toISOString();

            // Sending Log File to DMS
            let responseCreateLog = await createLogFileOnDMSFunc(logString, textFileName);
            console.log("responseCreateLog-->", responseCreateLog);
            console.log(logString)
            // return "SYNC"
            return logString

        } catch (err) {
            console.error('CRITICALERRORINREALTIMECUSTOMERORDERSYNCTOS4', err);
            throw new Error('FAILEDTOSYNCORDERS', err.message);
        }
    }*/
    async function validateModifiedPaylod(payload) {
        var error = '';
        let payloadToValidate = payload.insertVehicleModification.InsertVehicleModificationRequest.request;
        if (payloadToValidate.ReferenceNo == '' || payloadToValidate.ReferenceNo == null) {
            error = error + ReturnConstants().cValidatedPayload.cReferenceNo + payloadToValidate.ReferenceNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.InspectionCenterCode == '' || payloadToValidate.InspectionCenterCode == null) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionCenterCode + payloadToValidate.InspectionCenterCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.ChassisNo == '' || payloadToValidate.ChassisNo == null) {
            error = error + ReturnConstants().cValidatedPayload.cChassisNo + payloadToValidate.ChassisNo + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.InspectionDate == '' || payloadToValidate.InspectionDate == null) {
            error = error + ReturnConstants().cValidatedPayload.cInspectionDate + payloadToValidate.InspectionDate + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.GroupCode == '' || payloadToValidate.GroupCode == null) {
            error = error + ReturnConstants().cValidateModifiedPaylod.cGroupCode + payloadToValidate.GroupCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.SubGroupCode == '' || payloadToValidate.SubGroupCode == null) {
            error = error + ReturnConstants().cValidateModifiedPaylod.cSubGroupCode + payloadToValidate.SubGroupCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.Level == '' || payloadToValidate.Level == null) {
            error = error + ReturnConstants().cValidateModifiedPaylod.cLevel + payloadToValidate.Level + ReturnConstants().cGeneralError.cInvalid;
        }
        if (payloadToValidate.SystemCode == '' || payloadToValidate.SystemCode == null) {
            error = error + ReturnConstants().cValidateModifiedPaylod.cSystemCode + payloadToValidate.SystemCode + ReturnConstants().cGeneralError.cInvalid;
        }
        if (error == '') {
            return true;
        } else {
            return error;
        }
    }

    async function modifiedADMobilityFunc() {
        try {
            var logString = "****************************" + ReturnConstants().cModifiedVehicle.executionStartMsg + getCurrentDateTimeString() + "**************************** \n";

            let result = await cds.run(ReturnConstants().cProcedures.cModifiedDataProcedure);

            result = result.RESULT;

            logString = logString + ReturnConstants().cModifiedVehicle.totalRecordProcessed + result.length + ReturnConstants().cModifiedVehicle.dataFromTable;
            var responseOrders = [];
            if (result.length > 0) { } else {
                return ReturnConstants().employeePasswordNotification.noRecordProcessed;
            }
            for (let item of result) {

                let plantItcCode = await cds.run(`${ReturnConstants().cProcedures.cItcPlantDataProcedure}(PLANT_CODE => '${item.PLANTCODE}',PLANT_ITC_CODE => ?)`);


                var inspectionCenterCode = plantItcCode.PLANT_ITC_CODE ? parseInt(plantItcCode.PLANT_ITC_CODE) : 1;
                var vehicleInformation = await cds.run(SELECT.from(VehicleMasters).where({
                    vehicleMastersUUID: item.VEHICLEDETAILS_VEHICLEMASTERSUUID
                }));

                var comments = await cds.run(SELECT.from(TestResModifiedComm).where({
                    testResultsModifiedDetail: item.TESTRESULTSMODIFIEDUUID
                }));

                let cPayload = {
                    "insertVehicleModification": {
                        "Header": {
                            "sourceApp": ReturnConstants().aknowledgementApiConstants.cPayloadSourceApp,
                            "transactionId": cds.utils.uuid()
                        },
                        "InsertVehicleModificationRequest": {
                            "request": {
                                "ReferenceNo": parseInt(item.SERVICEREQUESTNO),
                                "InspectionCenterCode": inspectionCenterCode,
                                "ChassisNo": vehicleInformation[0].chasisNumber,
                                "InspectionDate": item.OVERALLTESTENDDATE, // should be OVERALLTESTENDDATE
                                "GroupCode": parseInt(item.TESTMAINTYPENO),
                                "SubGroupCode": parseInt(item.TESTSUBTYPENO),
                                "Level": parseInt(item.MODIFYSTAGECODE),
                                "Comments": comments[0]?.Comments ?? "", //"string"
                                "SystemCode": ReturnConstants().aknowledgementApiConstants.cPayloadSystemCode,
                                "UserID": ReturnConstants().aknowledgementApiConstants.cPayloadUserID
                            }
                        }
                    }
                };


                var isValidPayload = await validateModifiedPaylod(cPayload);

                if (isValidPayload == true) {
                    logString = logString + ReturnConstants().cModifiedVehicle.cValidPayload;
                    logString = logString + ReturnConstants().cModifiedVehicle.cPayloadSent + JSON.stringify(cPayload) + "\n";

                    const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
                    const responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cModifiedVehicle, cPayload);
                    let resultCode = responseAutoConfig.insertVehicleModificationResponse.responseStatus.statusCode;
                    let resultSerial = responseAutoConfig.insertVehicleModificationResponse?.InsertVehicleModificationResponse?.InsertVehicleModificationResult?.InsertVehicleModificationResult?.SerialNo ?? "";
                    logString = logString + ReturnConstants().cModifiedVehicle.responseApi + JSON.stringify(responseAutoConfig);
                    if (resultCode == 0 && resultSerial != '') {
                        logString = logString + ReturnConstants().cModifiedVehicle.cResultSerial + " = " + resultSerial;
                        //TestResultsModifiedDetail.modifiedItcSerialNo ==>item.TESTRESULTSMODIFIEDUUID
                        await UPDATE(TestResultsModifiedDetail)
                            .set({ modifiedItcSerialNo: resultSerial, modifiedItcSentDate: new Date(), modifiedItcSentStatus: "S", modifiedItcSentResponse: JSON.stringify(responseAutoConfig) })
                            .where({ TestResultsModifiedUUID: item.TESTRESULTSMODIFIEDUUID });
                        responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, InspectionCenterCode: inspectionCenterCode, ChassisNo: vehicleInformation[0].chasisNumber, GroupCode: item.TESTMAINTYPENO, SubGroupCode: item.TESTSUBTYPENO, Level: item.MODIFYSTAGECODE, isSynced: true, Acknowledgenumber: resultSerial }]);
                    } else {
                        var error = responseAutoConfig.insertVehicleModificationResponse?.responseStatus?.errorDetails ?? ReturnConstants().cModifiedVehicle.cProcessError;
                        await UPDATE(TestResultsModifiedDetail)
                            .set({ modifiedItcSerialNo: resultSerial, modifiedItcSentDate: new Date(), modifiedItcSentStatus: "F", modifiedItcSentResponse: JSON.stringify(error) })
                            .where({ TestResultsModifiedUUID: item.TESTRESULTSMODIFIEDUUID });

                        logString = logString + "\n" + ReturnConstants().cModifiedVehicle.cProcessError + "=\n" + JSON.stringify(error) + "\n";
                        //inster into logs table
                        responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, InspectionCenterCode: inspectionCenterCode, ChassisNo: vehicleInformation[0].chasisNumber, GroupCode: item.TESTMAINTYPENO, SubGroupCode: item.TESTSUBTYPENO, Level: item.MODIFYSTAGECODE, isSynced: false, msg: error }]);
                        var errorlog = {
                            documentRefNo: null,
                            errorResponse: JSON.stringify(error),
                            reqPayload: JSON.stringify(cPayload),
                            module: ReturnConstants().cModifiedVehicle.cModuleName,
                            endPoint: ReturnConstants().destinationCLM.cModifiedVehicle,
                            methodCalled: getCurrentFunctionName()
                        }
                        await INSERT.into(ErrorLogs).entries(errorlog);
                    }
                } else {
                    console.log('herefalse');
                    responseOrders.push([{ serviceRequestNo: item.SERVICEREQUESTNO, isSynced: false, msg: isValidPayload }]);
                    logString = logString + ReturnConstants().cModifiedVehicle.cInValidPayload + isValidPayload + "\n";
                    logString = logString + ReturnConstants().cModifiedVehicle.cPayloadSent + JSON.stringify(cPayload);
                }

            }
            var textFileName = ReturnConstants().cModifiedVehicle.cLogFilename + new Date().toISOString() + ".txt";
            logString = logString + ReturnConstants().cModifiedVehicle.logFileNameString + textFileName + '\n';
            logString = logString + '\n****************************' + ReturnConstants().cModifiedVehicle.executionEndMsg + getCurrentDateTimeString() + '****************************\n';
            console.log('logString = ', logString);
            await createLogFileOnDMSFunc(logString, textFileName);
            //return result.length + ReturnConstants().cModifiedVehicle.recordProcessed;
            return responseOrders;
        } catch (error) {
            //inster into logs table
            console.log('error = ', error);
            var errorlog = {
                documentRefNo: null,
                errorResponse: JSON.stringify(error),
                reqPayload: "",
                module: ReturnConstants().cModifiedVehicle.cModuleName,
                endPoint: ReturnConstants().destinationCLM.cModifiedVehicle,
                methodCalled: getCurrentFunctionName()
            }
            await INSERT.into(ErrorLogs).entries(errorlog);
            return { error: true, msg: error }
            //return error;            
        }

    }

    service.on('modifiedADMobility', async (req) => {
        return await modifiedADMobilityFunc();
    })

    service.on('syncMasterDataInBtpFromITC', async (req) => {

        updateVehicleMakesInBTPFromITCFunc();
        updateVehicleModelsInBTPFromITCFunc();
        updatePlateAttPlacesInBTPFromITCFunc();
        updateRegCardRemarksInBTPFromITCFunc();
        updateVehiclePlateKindsInBTPFromITCFunc();
        updateVehiclePlateColorsInBTPFromITCFunc();
        updateVehiclePlateSourcesInBTPFromITCFunc();
        updateVehicleFuelsInBTPFromITCFunc();
        updateVehicleSteeringsInBTPFromITCFunc();
        updateVehicleWeightsInBTPFromITCFunc();
        updateVehicleGearsInBTPFromITCFunc();
        updateTrfNationalitiesInBTPFromITCFunc();
        updateVehicleColorsInBTPFromITCFunc();
        updateVehicleTypesInBTPFromITCFunc();
        updateVehicleKindsInBTPFromITCFunc();
        updateVehicleRefencesInBTPFromITCFunc();

    });

    //#region 

    //## Development is ongoing; please do not consider it for code review yet.
    //## Approval Flow and Customer Portal - Trupti  - below



    /***********************************************************
     *  function to get context for a task
     ***********************************************************/
    async function GetTaskContext(task) {

        const id = task.id; //b61d1e55-714c-11f0-8f61-eeee0a813ef6
        const connectionPost = await cds.connect.to('SAPWORKFLOW');
        const response = await connectionPost.get('/public/workflow/rest/v1/task-instances/' + id + '/context');

        console.log('respine', response);
        return {
            id: task.id,
            status: task.status,
            subject: task.subject,
            recipientUsers: task.recipientUsers[0],
            workflowInstanceId: task.workflowInstanceId,
            orderNumber: response.orderNumber,
            orderLineNumber: response.orderLineNumber
        };
    }

    /***********************************************************
 *  function to create a new workflow instance
 ***********************************************************/
    async function startWorkflowInstance(context) {
        try {
            const body = context;
            const connectionPost = await cds.connect.to('SAPWORKFLOW');
            const response = await connectionPost.post('/public/workflow/rest/v1/workflow-instances', body);
            return response.id;

        } catch (error) {
            throw error;
        }
    }

    /***********************************************************************************************************************
     *  Approval - function to call external workflow APT to getOpenTasksForUser based upon email or workflowInstance 
     ***********************************************************************************************************************/
    async function getOpenTasksForUser(emailAddress, workflowInstanceId) {
        try {


            const oSAPWORKFLOW = await cds.connect.to('SAPWORKFLOW');
            var params = null;

            if (workflowInstanceId != null) {
                params = {
                    status: ReturnConstants().workflow.cReady,
                    workflowInstanceId: workflowInstanceId,
                    workflowDefinitionId: "eu10.add-dev-bldworkzone.addsalesorderapprovalworkflow.aDD_SalesorderApprovalWorkflowProcess"
                };
            }
            else {
                params = {
                    status: ReturnConstants().workflow.cReady,
                    recipientUsers: emailAddress,
                    workflowDefinitionId: "eu10.add-dev-bldworkzone.addsalesorderapprovalworkflow.aDD_SalesorderApprovalWorkflowProcess"
                };
            }

            const oResponse = await executeHttpRequest(
                { destinationName: oSAPWORKFLOW.destination },
                {
                    method: "GET",
                    url: `/public/workflow/rest/v1/task-instances`,
                    params: params,
                    headers: {
                        accept: 'application/json'
                    }
                }
            );

            ///const tasks = oResponse.data;
            return oResponse.data;

        } catch (error) {
            throw error;
        }
    };

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    /***********************************************************
     *  function to update Approval Request
     ***********************************************************/
    async function UpdateApprovalRequest(updateTaskToStatus, nextuseremail, taskInstanceId) {
        try {

            const payload = {
                "status": "COMPLETED",
                "decision": updateTaskToStatus,
                "context": {
                    "email": nextuseremail
                }
            };
            console.log('payload=>=>**', payload);
            //return;

            const oSAPWORKFLOW = await cds.connect.to('SAPWORKFLOW');
            const oResponse = await executeHttpRequest(
                { destinationName: oSAPWORKFLOW.destination },
                {
                    method: "PATCH",
                    //url: `/workflow/rest/v1/task-instances/959f9b92-7146-11f0-b4dc-eeee0a840d08`,
                    url: `/workflow/rest/v1/task-instances/` + taskInstanceId,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: payload
                }
            );

            console.log(`task Instance {$taskInstanceId} updated Successfully`);
            return;
        }
        catch (error) {
            console.error("Error occurred while updating a task instance", error);
            throw error;
        }
    }
    /***********************************************************
    Approval - function to get Open Task from sap build process automation api call function
    ***********************************************************/
    async function pollForTaskInstance(workflowInstanceId, retries = 5, delayMs = 4000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const tasks = await getOpenTasksForUser(null, workflowInstanceId);
            if (tasks && tasks.length > 0) {
                return tasks;
            }
            console.log(`Task not available yet. Retry ${attempt}/${retries}`);
            await delay(delayMs * attempt); // exponential backoff
        }
        return null;
    }

    /***********************************************************
     *  Approval - function to cancel  Workflow instance
     ***********************************************************/
    async function cancelWorkflowInstance(workflowInstanceId) {
        try {

            const payload = {
                "status": ReturnConstants().workflow.cCanceled,
                "cascade": false
            };
            const oSAPWORKFLOW = await cds.connect.to('SAPWORKFLOW');
            const oResponse = await executeHttpRequest(
                { destinationName: oSAPWORKFLOW.destination },
                {
                    method: "PATCH",
                    //url: `/workflow/rest/v1/task-instances/959f9b92-7146-11f0-b4dc-eeee0a840d08`,
                    url: `/workflow/rest/v1/workflow-instances/` + workflowInstanceId,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: payload
                }
            );
            return;
        }
        catch (error) {
            throw error;
        }
    }

    /***********************************************************
     *  Approval - Action to Assign task to another Supervisor
     ***********************************************************/
    service.on('AssignToAnotherUser', async (req) => {
        const approvalRequestDetails = req.data.workflowContext;
        console.log('ApprovalStatus =', approvalRequestDetails);

        const vehtestcharid = approvalRequestDetails.vehTestCharid;
        const updateTaskToStatus = approvalRequestDetails.approvalStatus;
        const tid = approvalRequestDetails.taskInstanceId;
        const wid = approvalRequestDetails.workflowInstanceId;

        // force override approverEmail for testing
        const nextuseremail = approvalRequestDetails.approverEmail || "tmahurkar@adnocdistribution.ae";

        // CAPM transaction object
        const tx = cds.transaction(req);

        try {
            // 1. External API call (may fail due to workflow issues/network errors)
            const apiResponse = await callAssignToAnotherUser(nextuseremail, tid);

            if (!apiResponse || apiResponse.status !== 200) {
                throw new Error(`Workflow API failed. Status: ${apiResponse?.status}`);
            }

            // 2. DB update inside transaction
            await updateTableTestChar_AP(wid, tid, nextuseremail, null, vehtestcharid, tx);

            // 3. Commit if all steps succeed
            await tx.commit();

            return {
                success: true,
                message: `Task ${tid} reassigned to ${nextuseremail}`,
            };

        } catch (error) {
            console.error("Error in AssignToAnotherUser:", error);

            // Rollback DB changes
            await tx.rollback();

            return {
                success: false,
                message: `Failed to reassign task. Reason: ${error.message}`,
            };
        }
    });

    /***********************************************************
     *  function to assign task to another user
     ***********************************************************/
    async function callAssignToAnotherUser(nextuseremail, taskInstanceId) {
        try {
            // claim & forward. This reserves the task & status =RESERVED
            /*
            {   
                "processor": "tmahurkar@adnocdistribution.ae"
            }
            */

            const payload = {
                "recipientUsers": nextuseremail
            };
            //console.log('payload=>=>**',payload);

            const oSAPWORKFLOW = await cds.connect.to('SAPWORKFLOW');
            const oResponse = await executeHttpRequest(
                { destinationName: oSAPWORKFLOW.destination },
                {
                    method: "PATCH",
                    //url: `/workflow/rest/v1/task-instances/959f9b92-7146-11f0-b4dc-eeee0a840d08`,
                    url: `/workflow/rest/v1/task-instances/` + taskInstanceId,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: payload
                }
            );

            console.log(`task Instance {$taskInstanceId} updated Successfully`);
            return;
        }
        catch (error) {
            console.error('CERRORMESSAGEWHILEUPDATINGTASKINSTANCE', error.message);
            throw error;
        }
    }

    /*******************************************************************************************************
     *  Customer Portal - action - Integration API to get SO-wise , vehicle-wise, order information for customer portal
     *******************************************************************************************************/
    service.on('getSOVehicleData_CP', async (req) => {

        let oResult = null;
        const { serviceRequestNo, sPlateNo } = req.data;

        //get complete order details for a vehicle
        const oDataJSON = await getSOVehicleData_CP(serviceRequestNo, sPlateNo);

        if (oDataJSON) {
            if (!Array.isArray(oDataJSON) || oDataJSON.length === 0) {
                return 'aa null';
            }

            // id of vehInspDetails
            const orderDetailGuid = oDataJSON[0].VehOrdInspDetails[0].vehicleOrderInspectionDetailsUUID;

            //get certificate & attachment data for order
            const x = await getDataFromDAttachmentAndDMSForOrder_CP(orderDetailGuid, 10); //DocType=10 => certificate only

            //return;
            //update json data with certificate details
            oResult = await updateJsonOrderObject_CP(oDataJSON, x);

        }
        return oResult;
    })

    async function getDataFromDAttachmentAndDMSForOrder_CP(orderDetailGuid, DocType) {

        let aArray = []; // empty dynamic array
        let i = 0;

        //get all lines for this Vehicle
        const qry = SELECT
            .from(VehicleOrderInspectionLines)
            .columns(ReturnConstants().cAttachment.cAttachmentGuId)  //certificate
            .where({ vehicleOrderInspectionDetails: orderDetailGuid })
            .and('CATTACHMENTGUIDISNOTNULL');
        const qryResult = await cds.tx(tx => tx.run(qry));
        let arrayData = []
        console.log(qryResult);
        if (qryResult != null) {

            for (let iCount of qryResult) {
                const oQuery = SELECT
                    .from(DAttachment)
                    //.where({ docGuid:orderGuid , docType: DocType});
                    .where({ attachmentGuId: iCount.attachmentGuId_attachmentGuId }
                    )
                    .and('CATTACHMENTGUIDISNOTNULL');

                const oAttachmentResult = await cds.tx(tx => tx.run(oQuery));
                console.log(ReturnConstants().cAttachment.cAttachmentResult, oAttachmentResult);
                let aResponse = await getAttachmentByGuidFromDMSFunc(oAttachmentResult[0].attachmentGuId);
                const sBase64Content = aResponse?.base64File || null;
                let data = {
                    attachmentGuid: oAttachmentResult[0].attachmentGuId,///
                    dmsObjectId: oAttachmentResult[0].dmsFileId,
                    orgFileName: oAttachmentResult[0].orgFileName,
                    sBase64Content: sBase64Content
                }
                arrayData.push(data);
                /*
                // Create sub-array dynamically
                aArray[i] = [
                    attachmentGuid,
                    dmsObjectId,
                    orgFileName,
                    sBase64Content
                ];
                */

                console.log('array row:', aArray[aArray.length - 1]);
            }
            console.log(arrayData);
        }

        return arrayData;
    }

    async function getDataFromDAttachmentAndDMSForOrder_CP_old(orderDetailGuid, DocType) {

        let aArray = []; // empty dynamic array
        let i = 0;


        const oQuery = SELECT
            .from(DAttachment)
            //.where({ docGuid:orderGuid , docType: DocType});
            .where({ docGuid: orderGuid });

        const oAttachmentResult = await cds.tx(tx => tx.run(oQuery));

        if (Array.isArray(oAttachmentResult) && oAttachmentResult.length > 0) {
            for (let row of oAttachmentResult) {
                attachmentGuid = row.attachGuid;
                dmsObjectId = row.dmsFileId;
                orgFileName = row.orgFileName;
                let aResponse = await getAttachmentByGuidFromDMSFunc(attachmentGuid);
                const sBase64Content = aResponse?.base64File || null;

                // Create sub-array dynamically
                aArray[i] = [
                    attachmentGuid,
                    dmsObjectId,
                    orgFileName,
                    sBase64Content
                ];

                console.log('array row:', aArray[aArray.length - 1]);
                i++;
            }
        }
        return aArray;
    }

    async function getSOVehicleData_CP(serviceRequestNo, sPlateNo) {

        try {
            const oQuery = SELECT
                .from(VehicleOrderInspections)
                .where({ serviceRequestNo: serviceRequestNo })
                .columns(a => {
                    a('*')
                    a.VehOrdInspDetails
                        .where({ plateNumber: sPlateNo })
                        (b => {
                            b('*')
                            b.VehicleDetails('*')
                                .where({ plateNumber: sPlateNo })
                            b.vehOrdInspLines
                                //.where({attachmentGuId_attachmentGuId : null})
                                (l => {
                                    l('*');
                                    l.termsCondition('*');
                                    l.vehOrdInspLinesTestChars
                                        // .where({ applicableTestName: { in: ['VI_CHANGE_VEHICLE_INFO', 'VI_ESMA_TEST', 'VI_TRAFFIC_TEST', 'VI_PERMIT_TEST', 'VI_COMPREHENSIVE_TEST'] } })
                                        (k => {
                                            k('*');
                                            k.vehicleOrderInspectionChangeVehicleLogs('*');
                                            //k.vehicleOrderInspectionChangeVehicleLogs //Trupti
                                            //.where({ fieldLabelEnglish: 'Mileage' })(x => { x('*') }); //Trupti
                                            k.testResultsESMAS('*');
                                            k.testResultsTraffics('*');
                                            k.testResTrafficAttachs('*');
                                            k.testResultsPermits('*');
                                            k.testResComps(m => {
                                                m('*');
                                                m.compResSubTypes('*');
                                            });
                                            k.testResultsVisuals(n => {
                                                n('*');
                                                n.testResultsVisualDetail('*');
                                            });
                                            k.testResMahaOutFileDtls(n => {
                                                n('*');
                                                n.testMahaOutResult('*');
                                            });
                                        });
                                });
                        });
                });

            const oDataResult = await cds.tx(async tx => await tx.run(oQuery));
            return oDataResult;

        } catch (error) {
            throw new Error('ERRORGETSOVEHICLEDATA', error.message);
        }
    }

    async function updateJsonOrderObject_CP(oDataJSON, x) {

        if (!Array.isArray(x) || x.length === 0) return oDataJSON;

        if (Array.isArray(oDataJSON)) {
            for (let row of oDataJSON) {
                if (Array.isArray(row.VehOrdInspDetails)) {
                    for (let rowVehOrdInspDetails of row.VehOrdInspDetails) {

                        if (Array.isArray(rowVehOrdInspDetails.vehOrdInspLines)) {
                            for (let rowvehOrdInspLines of rowVehOrdInspDetails.vehOrdInspLines) {
                                let attachGuid = rowvehOrdInspLines.attachmentGuId_attachmentGuId;
                                rowvehOrdInspLines.DMSObjectId = null;
                                rowvehOrdInspLines.orgFileName = null;
                                rowvehOrdInspLines.attachmentDMSBase64 = null;

                                if (attachGuid) {
                                    for (let i = 0; i < x.length; i++) {
                                        if (x[i].attachmentGuid == attachGuid) {
                                            rowvehOrdInspLines.DMSObjectId = x[i].dmsObjectId;
                                            rowvehOrdInspLines.orgFileName = x[i].orgFileName;
                                            rowvehOrdInspLines.attachmentDMSBase64 = x[i].sBase64Content;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return oDataJSON;
    }
    //## Approval Flow and Customer Portal - Trupti  - above
    //#endregion

    /***********************************************************
     *  Approval - action  to approve Approval Request
     ***********************************************************/
    service.on('ApproveApprovalRequest_AP', async (req) => {
        const approvalRequestDetails = req.data.workflowContexts;
        if (!Array.isArray(approvalRequestDetails) || approvalRequestDetails.length === 0) {
            return req.error(400, "APPROVEERRORMSG");
        }
        const results = [];
        for (const [index, obj] of approvalRequestDetails.entries()) {
            try {
                //Validate required fields
                if (!obj.vehTestCharid || !obj.approvalStatus || !obj.workflowInstanceId) {
                    results.push({ index, vehTestCharid: obj.vehTestCharid || null, status: "failed", error: "Missing required fields" });
                    continue;
                }
                const { vehTestCharid, approvalStatus, approverEmail, taskInstanceId, workflowInstanceId } = obj;
                const oQuery = SELECT.one
                    .from(EmployeeMaster)
                    .columns(a => {
                        a('empCode');
                        a('plantCode');
                        a('empEmailAddress');
                        a('empNameEnglish');
                        a('empRole');
                        a('empStatus');
                    })
                    .where({
                        empEmailAddress: approverEmail,
                        empStatus: 'A'
                    })

                // Always fetch only top 1
                oQuery.limit(1);

                const tx = cds.tx(req);
                let oSupervisorData = await tx.run(oQuery);

                // Call SAP Build Process Automation API
                try {
                    await UpdateApprovalRequest_AP('approve', approverEmail, taskInstanceId);
                    await updateTableTestChar_AP(workflowInstanceId, taskInstanceId, "NA", approvalStatus, vehTestCharid);

                    // Approval History
                    const oApprovalHistory = {
                        refDocumentID: vehTestCharid, // Reference to main document (e.g., PO or Leave)
                        performedByUserId: oSupervisorData.empCode, // Current approver user ID
                        performedByMailAddress: oSupervisorData.empEmailAddress, // Current approver email
                        performedByFullName: oSupervisorData.empNameEnglish, // Current approver full name
                        action: ReturnConstants().workflow.cApproved, // INITIATOR // APPROVED / REJECTED // RESENT
                        comments: approvalRequestDetails[0].approvalComments,// Remarks by approver
                        actionDate: new Date(), // Date and time of action
                        nextApproverUserId: "",// Next approver user ID
                        nextApproverMailAddress: "", // Next approver email
                        nextApproverFullName: "", // Next approver full name
                        nextApproverRole: "" // Role or designation of next approver

                    }

                    await INSERT.into(InspectionLinesApprovalHistory).entries(oApprovalHistory);

                } catch (apiErr) {
                    results.push({ index, vehTestCharid, status: "failed", error: `External API update failed: ${apiErr.message}` });
                    continue;
                }

                results.push({ index, vehTestCharid, status: "success", message: "Approval request processed successfully" });

            } catch (err) {
                results.push({ index, vehTestCharid: obj.vehTestCharid || null, status: "failed", error: err.message });
            }
        }
        return {
            successCount: results.filter(r => r.status === "success").length,
            failureCount: results.filter(r => r.status === "failed").length,
            details: results
        };
    });


    /**************************************************************************************
     *  Approval - function to get taskid
     *      **************************************************************************************/

    async function waitUntilTaskClosed(taskInstanceId, maxAttempts = 20, interval = 2000) {
        let attempt = 0;
        while (attempt < maxAttempts) {
            try {
                const oSAPWORKFLOW = await cds.connect.to('SAPWORKFLOW');
                const response = await executeHttpRequest(
                    { destinationName: oSAPWORKFLOW.destination },
                    {
                        method: "GET",
                        url: `/workflow/rest/v1/task-instances/${taskInstanceId}`,
                        headers: { accept: "application/json" }
                    }
                );

                if (response.data && response.data.status === ReturnConstants().testStatus.cCompleted) {
                    return true;
                }
            } catch (err) {
                return true; // Task gone → also means closed
            }
            await new Promise(res => setTimeout(res, interval));
            attempt++;
        }

        throw new Error(`Task ${taskInstanceId} did not complete after waiting ${(maxAttempts * interval) / 1000} seconds`);
    }

        /**************************************************************************************
     *  Approval - get task for next id 
     **************************************************************************************/

    async function waitForNextTask(workflowInstanceId, maxAttempts = 20, interval = 2000) {
        let attempt = 0;
        while (attempt < maxAttempts) {
            const tasks = await getOpenTasksForUser(null, workflowInstanceId);
            if (tasks && tasks.length > 0) {
                return tasks[0];
            }
            await new Promise(res => setTimeout(res, interval));
            attempt++;
        }

        throw new Error(`No new READY task found for workflowInstanceId ${workflowInstanceId}`);
    }


    /***********************************************************
     *  Approval - action  to reject Approval Request
     ***********************************************************/
    service.on('RejectApprovalRequest_AP', async (req) => {
        const approvalRequestDetails = req.data.workflowContexts;
        const results = [];

        for (const obj of approvalRequestDetails) {

            const { vehTestCharid, approvalStatus, approverEmail, inspectorEmail, taskInstanceId, workflowInstanceId } = obj;

            try {

                const tx = cds.transaction(req);

                const result = await tx.run(
                    SELECT.one.from(VehicleOrderInspectionLinesTestChar)
                        .columns('testInspectedByCode')
                        .where({ VehicleOrderInspectionLinesTestCharUUID: vehTestCharid })
                );

                const testInspectedByCode = result?.testInspectedByCode ?? null;

                const createdByInspectorData = await getCurrUserEmailAddress(req, '', 'INSPECTOR', testInspectedByCode);


                const oQuery = SELECT.one
                    .from(EmployeeMaster)
                    .columns(a => {
                        a('empCode');
                        a('plantCode');
                        a('empEmailAddress');
                        a('empNameEnglish');
                        a('empRole');
                        a('empStatus');
                    })
                    .where({
                        empEmailAddress: approverEmail,
                        empStatus: 'A'
                    })

                // Always fetch only top 1
                oQuery.limit(1);

                // const tx = cds.tx(req);
                let oSupervisorData = await tx.run(oQuery);

                // 2) Complete the current task (Reject)
                await UpdateApprovalRequest_AP('reject', approverEmail, taskInstanceId);

                // 3) Wait until SAP BPA marks task as COMPLETED
                await waitUntilTaskClosed(taskInstanceId);

                // 4) Wait for BPA to create the next task
                const nextTask = await waitForNextTask(workflowInstanceId);
                const curTaskInstance_1 = nextTask.id;

                // 5) Update DB
                await updateTableTestChar_AP(
                    workflowInstanceId,
                    curTaskInstance_1,
                    createdByInspectorData.empEmailAddress,
                    "IN-PROGRESS",
                    vehTestCharid
                );

                // Approval History
                const oApprovalHistory = {
                    refDocumentID: vehTestCharid, // Reference to main document (e.g., PO or Leave)
                    performedByUserId: oSupervisorData.empCode, // Current approver user ID
                    performedByMailAddress: oSupervisorData.empEmailAddress, // Current approver email
                    performedByFullName: oSupervisorData.empNameEnglish, // Current approver full name
                    action: ReturnConstants().workflow.cRejected, // INITIATOR // APPROVED / REJECTED // RESENT
                    comments: approvalRequestDetails[0].approvalComments,// Remarks by approver
                    actionDate: new Date(), // Date and time of action
                    nextApproverUserId: createdByInspectorData.empCode,// Next approver user ID
                    nextApproverMailAddress: createdByInspectorData.empEmailAddress, // Next approver email
                    nextApproverFullName: createdByInspectorData.empNameEnglish, // Next approver full name
                    nextApproverRole: ReturnConstants().workflow.Roles.cInspector // Role or designation of next approver

                }

                await INSERT.into(InspectionLinesApprovalHistory).entries(oApprovalHistory);

                results.push({ vehTestCharid, status: "success" });

            } catch (err) {
                results.push({ vehTestCharid, status: "failed", error: err.message });
            }
        }

        return {
            successCount: results.filter(r => r.status === "success").length,
            failureCount: results.filter(r => r.status === "failed").length,
            details: results
        };
    });


    /***********************************************************
     *  Approval - function to reSubmite rejected order for approval
     ***********************************************************/
    async function fnSendExistingOrderForApproval_AP(objvehTestChar, oInspectorData, oSupervisorData, req) {

        if (!objvehTestChar) throw new Error(400, "Missing information in request");

        const vehtestcharid = objvehTestChar.vehTestCharid;
        const workflowInstanceId = objvehTestChar.processWorkflowInstanceId;
        const oldTaskId = objvehTestChar.currTaskInstanceId;
        const sSupervisorEmail = objvehTestChar.sSupervisorEmail;

        try {

            if (!workflowInstanceId || !oldTaskId) {
                throw new Error("workflowInstanceId or taskInstanceId missing in workflowContext");
            }

            // (1) Complete Current Task (Submit to Next Step)
            await UpdateApprovalRequest_AP(ReturnConstants().workflow.cSubmit, sSupervisorEmail, oldTaskId);

            // (2) Wait until workflow marks this task COMPLETED
            await waitUntilTaskClosed(oldTaskId);

            // (3) Wait until workflow creates the new READY task
            const nextTask = await waitForNextTask(workflowInstanceId);
            const newTaskId = nextTask.id;

            // (4) Update DB
            await updateTableTestChar_AP(
                workflowInstanceId,
                newTaskId,
                sSupervisorEmail,
                null,
                vehtestcharid
            );

            // Approval History
            const oApprovalHistory = {
                refDocumentID: objvehTestChar.vehTestCharid, // Reference to main document (e.g., PO or Leave)
                performedByUserId: oInspectorData.empCode, // Current approver user ID
                performedByMailAddress: oInspectorData.empEmailAddress, // Current approver email
                performedByFullName: oInspectorData.empNameEnglish, // Current approver full name
                action: ReturnConstants().workflow.cResent, // INITIATOR // APPROVED / REJECTED // RESENT
                comments: "",// Remarks by approver
                actionDate: new Date(), // Date and time of action
                nextApproverUserId: oSupervisorData.empCode,// Next approver user ID
                nextApproverMailAddress: oSupervisorData.empEmailAddress, // Next approver email
                nextApproverFullName: oSupervisorData.empNameEnglish, // Next approver full name
                nextApproverRole: ReturnConstants().workflow.Roles.cSupervisor // Role or designation of next approver

            }

            await INSERT.into(InspectionLinesApprovalHistory).entries(oApprovalHistory);

            return {
                message: ReturnConstants().workflow.cResponseMsg,
                workflowInstanceId,
                taskId: newTaskId
            };

        } catch (error) {
            throw new Error("Failed to send order for approval: " + error.message);
        }
    }

        /**************************************************************************************
     *  Approval - function to get task instance
     **************************************************************************************/

    async function waitForTaskInstance(workflowInstanceId, maxAttempts = 20, interval = 2000) {
        let attempts = 0;

        while (attempts < maxAttempts) {
            const tasks = await getOpenTasksForUser(null, workflowInstanceId);
            if (tasks && tasks.length > 0) {
                return tasks[0]; // Return the first task
            }

            // wait before next retry
            await new Promise(res => setTimeout(res, interval));
            attempts++;
        }

        throw new Error(`Task not created after ${(maxAttempts * interval) / 1000} seconds`);
    }

    /***********************************************************
         *  Approval - function to send new order for approval
    ***********************************************************/
    async function fnSendNewOrderForApproval_AP(objvehTestChar, oInspectorData, oSupervisorData, req) {

        if (!objvehTestChar) {
            throw new Error(400, "Missing request details in request payload");
        }
        if (!objvehTestChar.vehTestCharid) {
            throw new Error(400, "vehTestCharid is mandatory");
        }

        let workflowInstanceId, taskId;

        try {
            const workflowContextPayload = {
                definitionId: "eu10.add-dev-bldworkzone.addsalesorderapprovalworkflow.aDD_SalesorderApprovalWorkflowProcess",
                context: {
                    servicerequestnumber: Number(objvehTestChar.servicerequestnumber),
                    orderid: objvehTestChar.servicerequestnumber,
                    vehtestcharid: objvehTestChar.vehTestCharid.toString(),
                    applicabletestcharname: objvehTestChar.applicabletestcharname,
                    platenumber: objvehTestChar.splateNumber,
                    materialcode: objvehTestChar.materialcode,
                    useremail: objvehTestChar.sSupervisorEmail
                }
            };

            // 1) Start Workflow Instance
            workflowInstanceId = await startWorkflowInstance(workflowContextPayload);

            // 2) Wait until the task gets created (Polling)
            const curTaskInstance = await waitForTaskInstance(workflowInstanceId);
            taskId = curTaskInstance.id;
            // 3) Update your DB
            await updateTableTestChar_AP(
                workflowInstanceId,
                taskId,
                objvehTestChar.sSupervisorEmail,
                null,
                objvehTestChar.vehTestCharid
            );

            // Approval History
            const oApprovalHistory = {
                refDocumentID: objvehTestChar.vehTestCharid, // Reference to main document (e.g., PO or Leave)
                performedByUserId: oInspectorData.empCode, // Current approver user ID
                performedByMailAddress: oInspectorData.empEmailAddress, // Current approver email
                performedByFullName: oInspectorData.empNameEnglish, // Current approver full name
                action: ReturnConstants().workflow.cInitiator,  // INITIATOR // APPROVED / REJECTED // RESENT
                comments: "",// Remarks by approver
                actionDate: new Date(), // Date and time of action
                nextApproverUserId: oSupervisorData.empCode,// Next approver user ID
                nextApproverMailAddress: oSupervisorData.empEmailAddress, // Next approver email
                nextApproverFullName: oSupervisorData.empNameEnglish, // Next approver full name
                nextApproverRole: ReturnConstants().workflow.Roles.cSupervisor // Role or designation of next approver

            }

            await INSERT.into(InspectionLinesApprovalHistory).entries(oApprovalHistory);

            return {
                message: ReturnConstants().workflow.cReqMsg,
                workflowInstanceId,
                taskId
            };

        } catch (error) {
            // Cancel workflow instance if created but flow failed
            if (workflowInstanceId) {
                try {
                    await cancelWorkflowInstance(workflowInstanceId);
                } catch (cancelError) {
                }
            }

            throw new Error(500, "Approval request failed: " + error.message);
        }
    }

    /*******************************************************************************************************
         *  Approval- function - get order details for a vehtestcharid
         *******************************************************************************************************/
    async function getOrderDetailsToCreateworkdflow_AP(req, vehTestCharId) {

        let oDataResult = null;
        try {

            const oQuery = SELECT.one
                .from(VehicleOrderInspectionLinesTestChar)
                .where({ VehicleOrderInspectionLinesTestCharUUID: vehTestCharId })
                .columns(t => {
                    t('*');
                    t.vehicleOrderInspectionLines(l => {
                        l('*');
                        l.vehOrdInspLinesTestChars('*');
                        l.vehicleOrderInspectionDetails(d => {
                            d('*');
                            d.vehicleOrderInspections(o => {
                                o('*');
                            });
                        });
                    });
                });

            const tx = cds.tx(req);
            oDataResult = await tx.run(oQuery);
            return oDataResult;

        } catch (error) {
            throw new Error(`Error in getOrderDetailsToCreateworkdflow_CP(): ${error.message}`);
        }
        return oDataResult;
    }

        /**************************************************************************************
     *  Approval - function to get user data
     **************************************************************************************/

    async function getCurrUserEmailAddress(req, plantCode, RoleType, CurrentUserId) {
        let oDataResult = null;
        try {
            const oQuery = SELECT.one
                .from(EmployeeMaster)
                .columns(a => {
                    a('empCode');
                    a('plantCode');
                    a('empEmailAddress');
                    a('empNameEnglish');
                    a('empRole');
                    a('empStatus');
                })
                .where({
                    empRole: RoleType,
                    empStatus: 'A'
                })
            // Add optional filtering only if CurrentUserId provided & not empty
            if (plantCode) {
                oQuery.and({ plantCode: plantCode });
            }

            // Add optional filtering only if CurrentUserId provided & not empty
            if (CurrentUserId) {
                oQuery.and({ empCode: CurrentUserId });
            }

            // Always fetch only top 1
            oQuery.limit(1);

            const tx = cds.tx(req);
            oDataResult = await tx.run(oQuery);
        } catch (error) {
            throw new Error(`Error in getCurrPlantActiveSupervisor(): ${error.message}`);
        }
        return oDataResult;
    }

    /**************************************************************************************
     *  Approval - function to update Approval Request using sap process automation API call
     **************************************************************************************/
    async function UpdateApprovalRequest_AP(updateTaskToStatus, nextuseremail, taskInstanceId) {
        try {

            const payload = {
                "status": ReturnConstants().testStatus.cCompleted,
                "decision": updateTaskToStatus,
                "context": {
                    "email": nextuseremail
                }
            };
            const oSAPWORKFLOW = await cds.connect.to('SAPWORKFLOW');
            const oResponse = await executeHttpRequest(
                { destinationName: oSAPWORKFLOW.destination },
                {
                    method: "PATCH",
                    //url: `/workflow/rest/v1/task-instances/959f9b92-7146-11f0-b4dc-eeee0a840d08`,
                    url: `/workflow/rest/v1/task-instances/` + taskInstanceId,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: payload
                }
            );

            return;
        }
        catch (error) {
            throw error;
        }
    }

    /***********************************************************
    Approval - function to update BTP TestChar table
    ***********************************************************/
    async function updateTableTestChar_AP(wid, tid, eid, tstatus, vtcid) {
        // Build update object dynamically
        const updateData = {
            processWorkflowInstanceId: wid,
            currTaskInstanceId: tid,
            pendingWithUser: eid
        };

        // Add tstatus only if not null/undefined
        if (tstatus !== null && tstatus !== undefined) {
            updateData.testStatus = tstatus
        }

        return await
            UPDATE('VehicleOrderInspectionLinesTestChar')
                .set(updateData)
                .where({ VehicleOrderInspectionLinesTestCharUUID: vtcid });
    }

    function _hasFieldDeep(obj, fields) {
        if (typeof obj !== 'object' || obj === null) return false;

        return Object.keys(obj).some(key => {
            if (fields.includes(key)) return true; // found at this level
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                return _hasFieldDeep(value, fields); // search deeper
            }
            return false;
        });
    }

    /*************************  
     * Approval - on confirm click send for approval
     */
    service.after(['CREATE', 'UPDATE'], "VehicleOrderInspectionLinesTestChar", async (req, data) => {
        const aResultField = [
            'testResultsTraffics', // --> Traffic Result
            'testResultsPermits', // --> Permit Result
            'testResComps', // --> Comprehensive Result
            'testResModDtl' // --> Modified Result
        ];

        const bHasResult = _hasFieldDeep(req, aResultField);

        if (bHasResult) {
            if ('testStatus' in req) { if (req.testStatus != ReturnConstants().testStatus.cPending) return; }

            let svehTestCharid = req.VehicleOrderInspectionLinesTestCharUUID;
            let aDataSet = await getOrderDetailsToCreateworkdflow_AP(req, svehTestCharid);

            // Start from the test char (this is the object)
            const aTestCharData = aDataSet;

            // Get the parent Line
            const line = aTestCharData.vehicleOrderInspectionLines;

            const approvalExists = line.vehOrdInspLinesTestChars.some(tc =>
                tc.applicableTestName === ReturnConstants().applicableNames.cVI_Approval
            );

            if (!approvalExists) {
                return;
            }

            // Since we queried a specific TestChar, this is always the only one:
            let sApplicableTestName = aTestCharData.applicableTestName;

            if (!([ReturnConstants().applicableNames.cTrafficTest, ReturnConstants().applicableNames.cModifiedTest, ReturnConstants().applicableNames.cComprehensiveTest, ReturnConstants().applicableNames.cPermitTest]
                .includes(sApplicableTestName))) return;

            // Get the parent Detail
            const detail = line.vehicleOrderInspectionDetails;

            // Get the parent Order
            const order = detail.vehicleOrderInspections;

            // Now consumption
            let oSupervisorData = await getCurrUserEmailAddress(req, order.plantCode, ReturnConstants().workflow.Roles.cSupervisor, '');

            // extracting empRole,empNameEnglish,empEmailAddress
            let oInspectorData = await getCurrUserEmailAddress(req, order.plantCode, ReturnConstants().workflow.Roles.cInspector, order.orderCreatedByCode);

            if (!oInspectorData) {
                return;
            }

            if (!oSupervisorData) {
                return;
            }

            // You need material info from the line
            let sServiceRequestNumber = order.serviceRequestNo;
            let splateNumber = line.plateNumber;
            let sMaterialCode = line.materialCode;

            let spendingWithUser = aTestCharData.pendingWithUser;
            let sprocessWorkflowInstanceId = aTestCharData.processWorkflowInstanceId;
            let scurrTaskInstanceId = aTestCharData.currTaskInstanceId;

            const oTestCharObj = {
                vehTestCharid: svehTestCharid,
                processWorkflowInstanceId: sprocessWorkflowInstanceId,
                currTaskInstanceId: scurrTaskInstanceId,
                pendingWithUser: spendingWithUser,
                servicerequestnumber: sServiceRequestNumber,
                orderid: sServiceRequestNumber,
                applicabletestcharname: sApplicableTestName,
                materialcode: sMaterialCode.toString(),
                plateNo: splateNumber,
                sInspectorEmail: oInspectorData.empEmailAddress,
                sSupervisorEmail: oSupervisorData.empEmailAddress
            };

            if (oTestCharObj.processWorkflowInstanceId != null) {
                await fnSendExistingOrderForApproval_AP(oTestCharObj, oInspectorData, oSupervisorData, req);
            }
            else {
                await fnSendNewOrderForApproval_AP(oTestCharObj, oInspectorData, oSupervisorData, req);
            }
        }
    })

    async function _callOverAllStatusProcedure(payload) {
        let sJsonData = JSON.stringify(payload);
        sJsonData = sJsonData.replace(/'/g, "''");

        const query = `${ReturnConstants().cProcedures.cGetOverAllStatus} ('${sJsonData}', RETURNDATA => ?)`;
        const oResult = await cds.db.run(query);
        return oResult.RETURNDATA;
    }


    /***********************************************************
    function to send notification for payment process for orders
    ***********************************************************/
    service.on('customerNotification', async (req) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let currentDate = now.toISOString().replace('T', ' ').split('.')[0];

        let aResult = await cds.db.run(`${ReturnConstants().cProcedures.cCustomerNotificationDataProcedure} ('${currentDate}', RESULT => ?)`);
        //return aResult;
        aResult = aResult.RESULT;
        for (let item of aResult) {

            if (item.COMMTYPESMS == 1) {
                var sCustomerMobileNumber = item.COUNTRYEXTENSION + item.MOBILENO;
                var smsText = ReturnConstants().cCustomerNotification.cPaymentSmsText.replace('<ordernum>', item.SERVICEREQUESTNO);
                var smsResponse = await sendSMSFunc([sCustomerMobileNumber], smsText);
                var isDelivered = true;
                var failureReason = '';
                var smsFlag = ReturnConstants().cCustomerNotification.cSuccess;
                var emailFlag = ReturnConstants().cCustomerNotification.cNotApplicableText;
                var whatsAppFlag = ReturnConstants().cCustomerNotification.cNotApplicableText;
                //if (smsResponse.data[0].status == ReturnConstants().cCustomerNotification.errorStatus) {
                if (smsResponse?.data?.[0]?.status === ReturnConstants().cCustomerNotification.errorStatus) {
                    //set oreder sms flag 
                    isDelivered = false;
                    failureReason = smsResponse.data[0].description;
                    smsFlag = ReturnConstants().cCustomerNotification.cFail;
                }
                //update oreder sms flag here
                await UPDATE(PaymentDocs)
                    .set({ paymentNotificationStatus: smsFlag, paymentNotificationError: failureReason, paymentNotificationSentAt: new Date(), paymentNotificationChannel: ReturnConstants().cCustomerNotification.cPaymentNotificationSMSChannel })
                    .where({ orderUUID: item.VEHICLEORDERINSPECTIONUUID });



                var objNotificationHistory = {
                    ID: cds.utils.uuid(),
                    scenarioType: ReturnConstants().cCustomerNotification.scenarioType,
                    smsContent: smsText,
                    messageSentDate: getFormattedDate(),
                    receipientMobile: sCustomerMobileNumber,
                    isDelivered: isDelivered,
                    failureReason: failureReason
                };
                //insertion into smsNotificationHistory
                await INSERT.into(smsNotificationHistory).entries(objNotificationHistory);

            }
            else if (item.COMMTYPEMAIL == 1) {

                var sCustomerEmail = item.EMAILADDRESS;
                var isDelivered = true;
                var failureReason = '';
                var emailFlag = ReturnConstants().cCustomerNotification.cSuccess;
                try {
                    let responseEmail = await sendEmailFunc(sCustomerEmail, ReturnConstants().employeePasswordNotification.emailText, ReturnConstants().employeePasswordNotification.emailSubject);
                } catch (error) {
                    var isDelivered = false;
                    var failureReason = error;
                    emailFlag = ReturnConstants().cCustomerNotification.cFail;
                }

                await UPDATE(PaymentDocs)
                    .set({
                        paymentNotificationStatus: emailFlag, paymentNotificationError: failureReason, paymentNotificationSentAt: new Date(), paymentNotificationChannel: ReturnConstants().cCustomerNotification.cPaymentNotificationMAILChannel,
                    })
                    .where({ orderUUID: item.VEHICLEORDERINSPECTIONUUID });

                await emailNotificationEntry(item.EMAILADDRESS, isDelivered, failureReason);
            }
            else if (item.COMMTYPEWHATSAPP == 1) {

            }
            else {
                //do nothing return false
            }

        }
        return aResult.length + ReturnConstants().Notification.recordProcessed;
    })

    /***********************************************************
    function to send Customer Detail for fetch Customer
    ***********************************************************/
    service.on('getCustomerDetails', async (req) => {
        try {
            const { sCustomerName, sCustomerMobile, sCustomerEmail } = req.data;

            // === Input validation ===
            // if (!sCustomerName || typeof sCustomerName !== ReturnConstants().cMaterialMessage.cString || sCustomerName.trim() === '') {
            //     return req.error(400, 'CURDATE');
            // }
            // if (!sCustomerMObile || typeof sCustomerMObile !== ReturnConstants().cMaterialMessage.cString || sPlantCode.trim() === '') {
            //     return req.error(400, 'PLANTCODE');
            // }
            // if (!sTestType || typeof sTestType !== ReturnConstants().cMaterialMessage.cString || sTestType.trim() === '') {
            //     return req.error(400, 'TESTTYPE');
            // }

            const aGetCustomerQuery = `${ReturnConstants().cProcedures.cCustomerDetails} ('${sCustomerName}', '${sCustomerMobile}', '${sCustomerEmail}', result => ?)`;
            const aCustomerResult = await cds.db.run(aGetCustomerQuery);
            const aResults = [];

            if (aCustomerResult.RESULT) {
                aResults.push({ result: aCustomerResult.RESULT });
            }

            return aResults;

        } catch (Error) {
            req.error('ERRORMESSAGE', Error);
            throw req.error('ERRORMESSAGE' + Error.message);
        }
    })

    service.on('reprintSMS', async (req) => {
        try {

            const oQuery = SELECT
                .from(VehicleOrderInspections)
                .where({
                    serviceRequestNo: req.data.serviceRequestNo
                })
                .columns(a => {
                    a('*');
                    a.customerCode('*');
                    a.VehOrdInspDetails(b => {
                        b('*');
                        //b.VehicleDetails('*');
                        b.vehOrdInspLines(l => {
                            l('*');
                            //l.vehicleOrderInspectionPricing(m => {m('*')})
                        });
                    });
                });
            const aResult = await cds.tx(async tx => await tx.run(oQuery));
            //return aResult;

            let result = aResult[0].VehOrdInspDetails;
            //aResult[0].customerCode.countryExtension = '91';
            //aResult[0].customerCode.mobileNo = '9582210688';
            let mobileNumber = aResult[0].customerCode.countryExtension + aResult[0].customerCode.mobileNo;

            for (let item of result) {
                for (let lineitem of item.vehOrdInspLines) {
                    if (lineitem.lineLevelCertLink != null) {
                        var cSmsText = ReturnConstants().reprintSMS.cSmsText.replace('<<link>>', lineitem.lineLevelCertLink);
                        var smsResponse = await sendSMSFunc([mobileNumber], cSmsText)
                        //console.log('smsResponse = ', smsResponse);
                        var isDelivered = true;
                        var failureReason = '';
                        var smsFlag = ReturnConstants().cCustomerNotification.cSuccess;
                        if (smsResponse?.data?.[0]?.status === ReturnConstants().cCustomerNotification.errorStatus) {
                            //set oreder sms flag 
                            isDelivered = false;
                            failureReason = smsResponse.data[0].description;
                            smsFlag = ReturnConstants().cCustomerNotification.cFail;
                        }
                        var objNotificationHistory = {
                            ID: cds.utils.uuid(),
                            scenarioType: ReturnConstants().reprintSMS.scenarioType,
                            smsContent: cSmsText,
                            messageSentDate: getFormattedDate(),
                            receipientMobile: mobileNumber,
                            isDelivered: isDelivered,
                            failureReason: failureReason
                        };
                        //insertion into smsNotificationHistory
                        await INSERT.into(smsNotificationHistory).entries(objNotificationHistory);

                    }
                }
            }
            return ReturnConstants().reprintSMS.cSmsSentsuccess;

        } catch (Error) {
            req.error('ERRORMESSAGE', Error);
            throw req.error('ERRORMESSAGE' + Error.message);
        }
    })
    service.on('syncReturnOrderBTPToS4hana', async (req) => {
        return await syncReturnOrderBTPToS4hanaFunc();
    });

    service.on("printTaxInvoiceCertificate", async (req) => {
        try {
            const {
                serviceRequestNo,
            } = req.data;

            const base64PDF = await taxInvoicePrint(
                serviceRequestNo,
                null,
                ReturnConstants().TestCertificate.cInvoiceCode
            );

            let sFileName = serviceRequestNo + "_" + ReturnConstants().TestCertificate.cInvoiceCode;
            let aFile = [{
                attachmentGuId: null,
                attachmentName: sFileName + ReturnConstants().TestCertificate.cExtension,
                orgFileName: sFileName,
                orgFileExtension: ReturnConstants().TestCertificate.cFileExtension,
                docType: null,
                docId: null,
                docGuid: null,
                base64File: base64PDF,
            }];
            let oDetailData = await SELECT.from(VehicleOrderInspections).columns(T1 => {
                T1("*");
                T1.VehOrdInspDetails(T2 => {
                    T2("*");
                    T2.vehOrdInspLines(T3 => {
                        T3("*");
                    });
                });
            }).where({ serviceRequestNo: serviceRequestNo });
            if (!oDetailData) {
                throw req.error("ORDERDATANOTFOUND");
            }
            let sDetailGuid = oDetailData.find(Item => true).VehOrdInspDetails.find(DItem => true).vehicleOrderInspectionDetailsUUID;

            try {

                let aUploadFileResponse = await uploadAttachmentInDMSFunc({ Files: aFile });
                if (aUploadFileResponse != null || aUploadFileResponse != undefined) {
                    if (aUploadFileResponse[0].attachmentGuId) {
                        await cds.run(UPDATE(VehicleOrderInspectionLines).set({ attachmentGuId_attachmentGuId: aUploadFileResponse[0].attachmentGuId }).where({ vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID: sDetailGuid }));
                    }
                    return {
                        attachmentGuId: aUploadFileResponse[0].attachmentGuId || null,
                        base64PDF: aUploadFileResponse[0].base64File || base64PDF
                    }
                };

            } catch (error) {
                throw error.message
            }


            return {
                status: "SUCCESS",
                base64: sTaxBase64
            };

        } catch (error) {
            console.error("TaxInvoicePrint Error:", error);

            // Return readable CAP error
            req.error(500, `Failed to generate Tax Invoice. Details: ${error.message}`);

            return; // stop execution
        }
    });

    service.after('CREATE', 'PaymentSet', async (req) => {
        //#region After payment, this code is used to map the attachment GUID after the attachment is inserted into the DMS
        const {
            orderNumber,
        } = req;


        /***** Fetch order data using the Service Request Number *****/

        let oDetailData = await SELECT.from(VehicleOrderInspections).columns(T1 => {
            T1("*");
            T1.VehOrdInspDetails(T2 => {
                T2("*");
                T2.vehOrdInspLines(T3 => {
                    T3("*");
                });
            });
        }).where({ serviceRequestNo: orderNumber });



        /***** Validate whether the order exists *****/
        if (!oDetailData) {
            throw req.error("ORDERDATANOTFOUND");
        }

        /***** Check whether the order type is Accessories (ZVCM) or Service Test (ZVTS) *****/

        let bIsAccessories = oDetailData.find(x => true).VehOrdInspDetails.find(x => true).vehOrdInspLines
            .every(l => l.materialType === ReturnConstants().materialType.cZvcm && l.materialGroup === ReturnConstants().materialTypeGroup.cAcrAcce);

        /***** If the order is Accessories (ZVCM), then execute the following logic *****/

        if (bIsAccessories) {

            /***** Fetch the PDF Base64 by calling the taxInvoicePrint function *****/

            const base64PDF = await taxInvoicePrint(
                orderNumber,
                null,
                ReturnConstants().TestCertificate.cInvoiceCode
            );

            /***** Prepare the payload required for inserting the attachment into the DMS *****/

            let sFileName = orderNumber + "_" + ReturnConstants().TestCertificate.cInvoiceCode;
            let aFile = [{
                attachmentGuId: null,
                attachmentName: sFileName + ReturnConstants().TestCertificate.cExtension,
                orgFileName: sFileName,
                orgFileExtension: ReturnConstants().TestCertificate.cFileExtension,
                docType: null,
                docId: null,
                docGuid: null,
                base64File: base64PDF,
            }];

            /***** Retrieve the GUID details for updating the lines with the attachment GUID *****/

            let sDetailGuid = oDetailData.find(Item => true).VehOrdInspDetails.find(DItem => true).vehicleOrderInspectionDetailsUUID;

            try {
                /***** Insert the attachment into the DMS *****/

                let aUploadFileResponse = await uploadAttachmentInDMSFunc({ Files: aFile });

                /***** Update the lines with the corresponding attachment information *****/

                if (aUploadFileResponse != null || aUploadFileResponse != undefined) {
                    if (aUploadFileResponse[0].attachmentGuId) {
                        await cds.run(UPDATE(VehicleOrderInspectionLines).set({ attachmentGuId_attachmentGuId: aUploadFileResponse[0].attachmentGuId }).where({ vehicleOrderInspectionDetails_vehicleOrderInspectionDetailsUUID: sDetailGuid }));
                    }
                    return {
                        attachmentGuId: aUploadFileResponse[0].attachmentGuId || null,
                        base64PDF: aUploadFileResponse[0].base64File || base64PDF
                    }
                };

            } catch (error) {
                throw error.message
            }
        }
        //#endregion code end
    })


    async function syncReturnOrderBTPToS4hanaFunc() {
        //var cSms = await getSmsTextByMaterialSIteCustomerCode(2000082,'V002','AE','e1a73b62-8ad6-4188-907b-81a00dc0c2f6');
        //return cSms;
        const now = new Date();
        if (now.getHours() < 4) {
            now.setDate(now.getDate() - 1);
        }
        now.setHours(0, 0, 0, 0);
        let currentDate = now.toISOString().replace('T', ' ').split('.')[0];
        const oQuery = SELECT
            .from(VehicleOrderInspections)
            .where({ orderSyncedS4: false, runningBusinessDate: currentDate, orderType: { in: ['ZVRN'] } })
            .columns(a => {
                a('*');
                a.customerCode('*');
                a.VehOrdInspDetails(b => {
                    b('*');
                    b.VehicleDetails('*');
                    b.vehOrdInspLines(l => {
                        l('*');
                        l.vehicleOrderInspectionPricing(m => {
                            m('*')
                        })
                    });
                });
            });

        const aResult = await cds.tx(async tx => await tx.run(oQuery));
        //return aResult;


        try {
            let logString = "****************************" + ReturnConstants().cS4SyncOrderFromBtpToHana.cExecutionStartMsg + getCurrentDateTimeString() + "**************************** \n";
            // getting Completed Orders
            const aGetServiceOrder = aResult;
            var responseOrders = [];
            if (aGetServiceOrder.length > 0) {
                for (let item of aGetServiceOrder) {
                    var orderSyncErrorLog = [];
                    let oOrderDetail = item;
                    // //Sync Customer 

                    let sCustomerUUID = oOrderDetail.customerCode_customerUUID;
                    var oCustomerDetail = oOrderDetail.customerCode;
                    if (oOrderDetail.customerCode != null) {
                        // Order Syncing start

                        try {
                            if (oCustomerDetail.isSynced == true && oOrderDetail.VehOrdInspDetails[0].vehOrdInspLines.length > 0) {
                                let sOrderSyncResponse = await syncReturnOrder(oOrderDetail);
                                var obj = [{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: sOrderSyncResponse }];
                                responseOrders.push(obj);
                            } else {

                                var orderSyncTransactionLog = {
                                    ID: cds.utils.uuid(),
                                    orderNumber: oOrderDetail.serviceRequestNo,
                                    customerNumber: oOrderDetail.customerCode?.customerNo || "",
                                    orderSync: false,
                                    requestPayload: '',
                                    response: '',
                                    errorMessage: ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerNotSynced
                                };
                                await insertOrderSyncLog(orderSyncTransactionLog);
                                var obj = [{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: ReturnConstants().cS4SyncOrderFromBtpToHana.cCustomerNotSynced }];
                                responseOrders.push(obj);
                            }

                        } catch (error) {

                            var orderSyncTransactionLog = {
                                ID: cds.utils.uuid(),
                                orderNumber: oOrderDetail.serviceRequestNo,
                                customerNumber: oOrderDetail.customerCode?.customerNo || "",
                                orderSync: false,
                                requestPayload: '',
                                response: '',
                                errorMessage: error.message
                            };
                            await insertOrderSyncLog(orderSyncTransactionLog);
                            var obj = [{ serviceRequestNo: oOrderDetail.serviceRequestNo, isSynced: error.message }];
                            responseOrders.push(obj);
                            //console.log('error.message = ', error.message)
                        }
                    } else {
                        responseOrders.push([{ serviceRequestNo: item.serviceRequestNo, msg: ReturnConstants().cS4SyncOrderFromBtpToHana.cNoCustomerFound }])
                    }

                }

            } else {
                logString = logString + ReturnConstants().cS4SyncOrderFromBtpToHana.cNoRecordFound;
                responseOrders.push(ReturnConstants().employeePasswordNotification.noRecordProcessed);
            }
            //console.log(logString)
            //console.log(JSON.stringify(responseOrders))

            return responseOrders;

        } catch (error) {
            //throw new Error(ReturnConstants().cCreateOrderLogfile.cSyncFailed);
            console.log(error);
            var orderSyncTransactionLog = {
                ID: cds.utils.uuid(),
                orderNumber: "",
                customerNumber: "",
                orderSync: false,
                requestPayload: '',
                response: '',
                errorMessage: error.message
            };
            await insertOrderSyncLog(orderSyncTransactionLog);
            //throw new Error(ReturnConstants().cCreateOrderLogfile.cSyncFailed);
        }

    }

    async function syncReturnOrder(orderData) {
        let syncStatus = false;
        let errorMessage = '';
        try {
            const cs4Destination = await cds.connect.to(ReturnConstants().destinationCLM.cDestination);
            let payload = await createSyncReturnOrderPayload(orderData, orderData.serviceRequestNo);

            const oValidatedPayload = payloadValidationForCreateOrderInS4(payload);
            if (oValidatedPayload == ReturnConstants().cSyncOrderValidation.cPayloadValidationSuccess) {
                try {
                    //if (orderData.s4DeliveryNo == null && orderData.orderReferenceNo == null) { previous logic
                    if (orderData.orderSyncDate == null) {
                        console.log('create') //for testing pupose
                        try {
                            console.log('here try');//for testing pupose
                            var responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cCreateOrderFromBtpToSap, payload);
                            let orderStatus = orderData.orderStatus;
                            if (orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cCompleteHeaderStatus || orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cUpdateHeaderStatus) {
                                //orderStatus = 'FREEZED'
                                orderStatus = ReturnConstants().cSyncOrderValidation.cOrderStatusFreezed;
                            }
                            let response = responseAutoConfig.SOHeaderSet?.SOHeader ?? null;
                            var cInvoiceno = responseAutoConfig.SOHeaderSet?.SOHeader?.Invoiceno ?? null;
                            var cDeliveryno = responseAutoConfig.SOHeaderSet?.SOHeader?.Deliveryno ?? null;

                            var isSync = await UPDATE(VehicleOrderInspections)
                                .set({
                                    orderSyncedS4: true,
                                    orderStatus: orderStatus,
                                    s4DeliveryNo: cDeliveryno,
                                    orderReferenceNo: cInvoiceno,
                                    orderSyncDate: new Date(),
                                    orderSyncedMessage: ReturnConstants().cSyncOrderValidation.cDBSyncedMsg
                                })
                                .where({ serviceRequestNo: orderData.serviceRequestNo });

                            var orderSyncTransactionLog = {
                                ID: cds.utils.uuid(),
                                orderNumber: orderData.serviceRequestNo,
                                customerNumber: orderData.customerCode?.customerNo || "",
                                orderSync: true,
                                requestPayload: JSON.stringify(payload),
                                response: JSON.stringify(responseAutoConfig),
                                errorMessage: ''
                            };
                            await INSERT.into(orderSyncLog).entries(orderSyncTransactionLog);
                            return { syncStatus: true, errorMessage: '' };
                        } catch (error) {
                            console.log('here catch');

                            var orderSyncTransactionLog = {
                                ID: cds.utils.uuid(),
                                orderNumber: orderData.serviceRequestNo,
                                customerNumber: orderData.customerCode?.customerNo || "",
                                orderSync: false,
                                requestPayload: '',
                                response: '',
                                errorMessage: JSON.stringify(error)
                            };
                            errorMessage = error.message
                            await INSERT.into(orderSyncLog).entries(orderSyncTransactionLog);

                            return { syncStatus: false, errorMessage: errorMessage };
                        }

                    } else {
                        console.log('update') //for testing pupose     
                        let orderStatus = orderData.orderStatus;
                        if (orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cCompleteHeaderStatus || orderData.s4Indicator == ReturnConstants().cSyncOrderValidation.cUpdateHeaderStatus) {
                            //orderStatus = 'FREEZED'
                            orderStatus = ReturnConstants().cSyncOrderValidation.cOrderStatusFreezed;
                        }
                        var responseAutoConfig = await cs4Destination.post(ReturnConstants().destinationCLM.cUpdateOrderFromBtpToSap, payload);
                        var isSync = await UPDATE(VehicleOrderInspections)
                            .set({
                                orderStatus: orderStatus,
                                s4Indicator: payload.SOHeaderSet.SOHeader.Indicator,
                                orderSyncedS4: true, orderSyncDate: new Date(),
                                orderSyncedMessage: ReturnConstants().cSyncOrderValidation.cDBSyncedMsg
                            })
                            .where({ serviceRequestNo: orderData.serviceRequestNo });
                        syncStatus = true;

                    }
                    if (responseAutoConfig) {

                        var orderSyncTransactionLog = {
                            ID: cds.utils.uuid(),
                            orderNumber: orderData.serviceRequestNo,
                            customerNumber: orderData.customerCode?.customerNo || "",
                            orderSync: true,
                            requestPayload: JSON.stringify(payload),
                            response: JSON.stringify(responseAutoConfig),
                            errorMessage: ''
                        };
                        await insertOrderSyncLog(orderSyncTransactionLog);
                        return { syncStatus: true, errorMessage: '' };
                    }
                } catch (error) {

                    var orderSyncTransactionLog = {
                        ID: cds.utils.uuid(),
                        orderNumber: orderData.serviceRequestNo,
                        customerNumber: orderData.customerCode?.customerNo || "",
                        orderSync: false,
                        requestPayload: JSON.stringify(payload),
                        response: JSON.stringify(error.response),
                        errorMessage: error.message
                    };
                    errorMessage = error.message
                    await insertOrderSyncLog(orderSyncTransactionLog);
                    return { syncStatus: false, errorMessage: errorMessage };

                }
            }
            else {

                var orderSyncTransactionLog = {
                    ID: cds.utils.uuid(),
                    orderNumber: orderData.serviceRequestNo,
                    customerNumber: orderData.customerCode?.customerNo || "",
                    orderSync: false,
                    requestPayload: JSON.stringify(payload),
                    response: ReturnConstants().cS4SyncOrderFromBtpToHana.cInvalidOrderPayload + oValidatedPayload + "\n",
                    errorMessage: oValidatedPayload
                };
                await insertOrderSyncLog(orderSyncTransactionLog);
                errorMessage = oValidatedPayload
                return { syncStatus: false, errorMessage: errorMessage };
            }

            return { syncStatus: syncStatus, errorMessage: errorMessage };


        } catch (err) {

            //throw new Error(ReturnConstants().cS4SyncOrderFromBtpToHana.cOrderSynFailed, err);
            var orderSyncTransactionLog = {
                ID: cds.utils.uuid(),
                orderNumber: orderData.serviceRequestNo,
                customerNumber: orderData.customerCode?.customerNo || "",
                orderSync: false,
                requestPayload: '',
                response: '',
                errorMessage: err.message
            };

            await insertOrderSyncLog(orderSyncTransactionLog);
            return { syncStatus: false, errorMessage: err };
        }

    }

    async function createSyncReturnOrderPayload(order, serviceRequestNo) {
        const oPaymentQuery = SELECT
            .from(PaymentDocs)
            .where({ orderNumber: serviceRequestNo })
            .columns(a => {
                a('*')
                a.items('*')
            });
        const aPaymentResult = await cds.tx(async tx => await tx.run(oPaymentQuery));

        const docDate = `/Date(${new Date(order.orderDate).getTime()})/`;
        let currentdate = new Date();

        //console.log("OrderCreatedByCode = ", order.orderCreatedByCode)
        //console.log("inspectionByCode = ", order.VehOrdInspDetails[0].vehOrdInspLines[0].inspectionByCode)
        var employeeDeatils = await SELECT.one.from(EmployeeMaster).where({
            empCode: order.orderCreatedByCode
        });
        // Prepare RTNOrderHDR
        const RTNOrderHDR = {
            CustomerNumber: order.customerCode?.customerNo || "",// "5000009927",
            ReturnOrder: order.serviceRequestNo || "",
            DocType: order.orderType || "", // || "ZVRN", 
            SalesOrg: order.salesOrganization || "",
            DistrChan: order.salesDivChnl || "",
            Division: order.division || "",
            ReqDateH: order.orderDate || "",  //TBD is it same as order date need to confirm with kiran
            Potype: "",
            Email: order.customerCode?.emailAddress || "",
            Spyourref: "",     //(Use in retrun order)
            PurchNoC: order.serviceRequestNo || "",
            Shcustref: "",     //TBD
            Shyourref: "",
            DocDate: order.orderDate,
            Acntref: "",
            Assignment: "",
            PaymtMeth: "",
            Soldto: order.customerCode?.customerType === ReturnConstants().cS4SyncOrderFromBtpToHana.cIndividualCustomer ? order.customerCode.customerNo : "", //customer code   

            Shipto: order.customerCode?.customerType === ReturnConstants().cS4SyncOrderFromBtpToHana.cIndividualCustomer ? order.plantCode : "",
            //order.customerCode.firstName + order.customerCode.lastName, //payer in case of B2C //order.plantCode
            Moptyp1: aPaymentResult[0]?.items[0]?.mopCode || "",  //"ZVCA", GIVE ERROR
            Cardno1: aPaymentResult[0]?.items[0]?.cardNumber || "",
            Cardtyp1: aPaymentResult[0]?.items[0]?.cardName || "", //"VISA",
            Rrnno1: aPaymentResult[0]?.items[0]?.rrn || "",
            Authcd1: "",
            Custid1: order.customerCode?.customerNo || "",//order.customerCode?.customerNo , TBD
            Custtyp1: order.customerCode?.customerType === ReturnConstants().cS4SyncOrderFromBtpToHana.cIndividualCustomer ? ReturnConstants().cS4SyncOrderFromBtpToHana.cB2cCustomer : ReturnConstants().cS4SyncOrderFromBtpToHana.cB2bCustomer,//"B2C",
            Amt1: aPaymentResult[0]?.items[0]?.amount || "",// || "100.00",
            Utrnno1: order.paymentUTRNo || "", //"UTRN00000000000000000000000001", //TBD that for 1 Order Only 1 UTR
            Moptyp2: aPaymentResult[0]?.items[1]?.mopCode || "",
            Cardno2: aPaymentResult[0]?.items[1]?.cardNumber || "",
            Cardtyp2: aPaymentResult[0]?.items[1]?.cardName || "",
            Rrnno2: aPaymentResult[0]?.items[1]?.rrn || "",
            Authcd2: "",
            Custid2: order.customerCode?.customerNo || "", // order.customerCode?.customerNo 
            Custtyp2: "",
            Amt2: aPaymentResult[0]?.items[1]?.amount || "",
            Utrnno2: "",
            Moptyp3: aPaymentResult[0]?.items[2]?.mopCode || "",
            Cardno3: aPaymentResult[0]?.items[2]?.cardNumber || "",
            Cardtyp3: aPaymentResult[0]?.items[2]?.cardName || "",
            Rrnno3: aPaymentResult[0]?.items[2]?.rrn || "",
            Authcd3: "",
            Custid3: order.customerCode?.customerNo || "", // order.customerCode?.customerNo 
            Custtyp3: "",
            Amt3: aPaymentResult[0]?.items[2]?.amount || "",
            Utrnno3: "",
            Moptyp4: aPaymentResult[0]?.items[3]?.mopCode || "",
            Cardno4: aPaymentResult[0]?.items[3]?.cardNumber || "",
            Cardtyp4: aPaymentResult[0]?.items[3]?.cardName || "",
            Rrnno4: aPaymentResult[0]?.items[3]?.rrn || "",
            Authcd4: "",
            Custid4: order.customerCode?.customerNo || "", // order.customerCode?.customerNo 
            Custtyp4: "",
            Amt4: aPaymentResult[0]?.items[3]?.amount || "",
            Utrnno4: "",

            Bussdate: order.runningBusinessDate, //On the basis of Shift get the Business Date.order.businessDate
            Shiftdetails: order.runningShiftName || ReturnConstants().cS4SyncOrderFromBtpToHana.cDayShift,
            Shiftfrmtime: order.shiftFromTime || "",
            Shifttotime: order.shiftToTime || "",
            //Empcode: order.VehOrdInspDetails[0].inspectionByUser,
            Empcode: order.VehOrdInspDetails[0].vehOrdInspLines[0].inspectionByCode,
            Empname: employeeDeatils?.empNameEnglish ?? "",
            Emirate: employeeDeatils?.empEmiratesId ?? "",
            //Custtype: order.customerCode.customerType || "",//empty //b2c or b2b
            Custtype: order.customerCode?.customerType === ReturnConstants().cSyncOrderValidation.cCustomerTypeInd ? ReturnConstants().cSyncOrderValidation.cCustomerTypeB2C : ReturnConstants().cSyncOrderValidation.cCustomerTypeB2B,//"B2C",,//empty //b2c or b2b
            Lanetyp: order.VehOrdInspDetails[0].laneTypeCode || "",//order.VehOrdInspDetails[0].laneCode
            Outstandbal: "",
            Advamt: "",
            Videocalurl: "",
            Ngvcust: "",
            Deliveryno: order.s4DeliveryNo || "",
            Invoiceno: order.orderReferenceNo || "",
            Items: {
                SOItems: []
            },
            Attachments: {
                SOAttachments: [
                    {
                        FileName: "",
                        Description: "",
                        Attachment: ""
                    },
                    {
                        FileName: "",
                        Description: "",
                        Attachment: ""
                    }
                ]
            }
        };


        for (const detail of order.VehOrdInspDetails || []) {
            for (const line of detail.vehOrdInspLines || []) {

                const SOItem = {
                    Order: order.serviceRequestNo,
                    ItmNumber: String(line.orderLineNo || ''),
                    Indicator: String(line.LineIndicator || ''),
                    Material: String(line.materialCode || ''),
                    Plant: detail.plantCode || '',
                    StoreLoc: "",
                    TargetQty: line?.quantity,//|| "10",
                    TargetQu: line?.currencyCode,
                    PymtMeth: "", //empty
                    PartnRole: "",//empty
                    PartnNumb: "",//empty
                    PitmNumber: "",
                    ReqQty: line.quantity || '1',
                    Zzplateno: detail.VehicleDetails?.plateNumber,
                    Zzplatesource: (detail.VehicleDetails?.plateSourceCode + ", " + detail.VehicleDetails?.plateSourceEnglish).slice(0, 40),
                    Zzplatecolor: (detail.VehicleDetails?.plateColorCode + ", " + detail.VehicleDetails?.bodyColorEnglish).slice(0, 40),
                    Zzplatekind: (detail.VehicleDetails?.plateKindCode + ", " + detail.VehicleDetails?.plateKindEnglish).slice(0, 40),
                    Zzplatecode: detail.plateKind || "",
                    Zzurl: line?.lineLevelCertLink ? (line?.lineLevelCertLink).slice(0, 100) : "",
                    Zzoverallstatus: line.overallTestStatus || "",
                    ZzchasisNo: detail.VehicleDetails?.chasisNumber,
                    ZzengineNo: detail.VehicleDetails?.engineNumber,
                    Zznationality: detail.VehicleDetails?.nationalityCode + ", " + detail.VehicleDetails?.nationalityEnglish,
                    Zzmanufacturer: detail.VehicleDetails?.manfacturerCode + ", " + detail.VehicleDetails?.manfacturerEnglish,
                    Zzmodel: detail.VehicleDetails?.modelCode + ", " + detail.VehicleDetails?.modelEnglish,
                    ZzbodyColor: (detail.VehicleDetails?.bodyColorCode + ", " + detail.VehicleDetails?.bodyColorEnglish).slice(0, 40),
                    Zzlanenumber: detail.laneCode || "",
                    Zzvhtype: (detail.VehicleDetails?.typeCode + ", " + detail.VehicleDetails?.typeEnglish).slice(0, 25) || "",
                    Zzyear: detail.VehicleDetails?.registrationYear,
                    Zzsmssta: line.isDeliverySmsStatus === true ? ReturnConstants().cS4SyncOrderFromBtpToHana.cSmsSentText : "",
                    Zzkindcd: detail.plateKind || "",   //detail.plateKind or //GIVE ERROR WHEN GIVE VALUE   //detail.VehicleDetails?.kindCode + ", " + detail.VehicleDetails?.kindEnglish,
                    Zzshdldt: currentdate,//upated at
                    Zzshdltime: "",
                    Zzbooksite: "",
                    Zzreshdlgt: currentdate,
                    Zzvehclcat: "",
                    Zzconvoper: "",
                    Zztpinum: "",
                    ShipType: "",
                    ItemsCond: {
                        SOItemCond: []
                    }
                };
                //console.log('line.vehicleOrderInspectionPricing = ', line.vehicleOrderInspectionPricing);
                for (const itmCond of line.vehicleOrderInspectionPricing) {
                    const SOItemCond = {
                        Order: order.serviceRequestNo,
                        ItmNumber: String(line.orderLineNo),
                        CondType: itmCond.condType,
                        CondValue: itmCond.condValue,
                        Currency: line.currencyCode
                    }

                    SOItem.ItemsCond.SOItemCond.push(SOItemCond);
                }

                RTNOrderHDR.Items.SOItems.push(SOItem);
            }
        }

        return {
            RTNOrderHDRSet: {
                RTNOrderHDR
            }
        };
    }

    async function getSmsTextByMaterialSIteCustomerCode(materialCode, siteCode, siteRegion, customerUUID) {
        const customer = await cds.tx(tx =>
            tx.run(
                SELECT.one.from(CustomerMasters).where({ customerUUID }).limit(1)
            )
        );

        const queries = [
            { materialCode: materialCode, siteCode: siteCode, siteRegion: siteRegion },
            { materialCode: materialCode, siteCode: siteCode },
            { materialCode: materialCode },
            {}
        ];

        let smsData;
        var i = 0;
        for (const cond of queries) {
            console.log(++i)
            smsData = await cds.tx(tx =>
                tx.run(
                    SELECT.one.from(SmsMasters)
                        .where({ ...cond, smsType: { in: [ReturnConstants().smsTextMaterial.cReciept, ReturnConstants().smsTextMaterial.cRecieptHappiness] } })
                        .limit(1)
                )
            );
            if (smsData) break;
        }

        // 4. If nothing found, return null
        if (!smsData) return null;

        // 5. Return language-specific template
        return customer?.prefLangEng
            ? smsData.emailTemplate
            : smsData.arTemplate;
    }

    });
////## Approval Flow and Customer Portal - Trupti  - above - REVISED    
