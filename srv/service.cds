using {ADD_VI} from '../db/datamodel';


service VehicleinspectionService {
    // ANPR Capture Entity Set
    entity AnprCaptures                            as projection on ADD_VI.AnprCaptures;
    // ANPR Site Lane Entity Set
    entity AnprSiteLaneConfigs                     as projection on ADD_VI.AnprPlantLaneConfigs;
    // Customer Entity Set
    entity CustomerMasters                         as projection on ADD_VI.CustomerMasters;
    // vehicle Entity Set
    entity VehicleMasters                          as projection on ADD_VI.VehicleMasters;
    // Test Result Entity Set
    entity Header                                  as projection on ADD_VI.TestResultsTraffic;
    //Vehicle Lookup Entity Set                                                                                                returns array of String;
    entity VehicleLookupConfiguration              as projection on ADD_VI.VehicleLookupConfiguration;
    //Vehicle Lookup Entity Set
    entity TestResTrafficAttachs                   as projection on ADD_VI.TestResTrafficAttachs;
    //Country Entity Set
    entity CountryMasters                          as projection on ADD_VI.CountryMasters;
    //Country ITC Entity Set
    entity CountryItcMasters                       as projection on ADD_VI.CountryItcMasters;
    //Manufacturer Entity Set
    entity ManufacturerMasters                     as projection on ADD_VI.ManufacturerMasters;
    // Vehicle Plate Kind Entity Set
    entity VehPlateKindMasters                     as projection on ADD_VI.VehPlateKindMasters;
    // Model Entity Set
    entity ModelMasters                            as projection on ADD_VI.ModelMasters;
    // Vehicle Kind Entity Set
    entity VehicleKindMasters                      as projection on ADD_VI.VehicleKindMasters;
    // Vehicle type Entity Set
    entity VehicleTypeMasters                      as projection on ADD_VI.VehicleTypeMasters;
    // Body Color Entity Set
    entity BodyColorMasters                        as projection on ADD_VI.BodyColorMasters;
    // Gear Type Entity Set
    entity GearTypeMasters                         as projection on ADD_VI.GearTypeMasters;
    // Fuel Type Entity Set
    entity FuelTypeMasters                         as projection on ADD_VI.FuelTypeMasters;
    // Steering Side Entity Set
    entity SteeringSideMasters                     as projection on ADD_VI.SteeringSideMasters;
    // Weight Kind Entity Set
    entity WeightKindMasters                       as projection on ADD_VI.WeightKindMasters;
    // Reg Car Remark Entity Set
    entity RegCarRemarkMasters                     as projection on ADD_VI.SteeringSideMasters;
    // Lost Plate Entity Set
    entity LostPlateMasters                        as projection on ADD_VI.LostPlateMasters;
    // Damaged Plate Entity Set
    entity DamagedPlateMasters                     as projection on ADD_VI.DamagedPlateMasters;
    // Mileage Mtr Status Entity Set
    entity MileageMtrStatusMasters                 as projection on ADD_VI.MileageMtrStatusMasters;
    // Vehicle Plate Source Entity SetPLANTMASTERS
    entity VehPlateSourceMasters                   as projection on ADD_VI.VehPlateSourceMasters;
    // Vehicle Plate color Entity Set
    entity VehPlateColorMasters                    as projection on ADD_VI.VehPlateColorMasters;
    //Plate Entity Set
    entity PlantMasters                            as projection on ADD_VI.PlantMasters;
    //Material Entity Set
    entity MaterialMasters                         as projection on ADD_VI.MaterialMasters;
    //Material Pricing Entity Set
    entity MaterialPricingMasters                  as projection on ADD_VI.MaterialPricingMasters;
    //Attachment Pricing Entity Set
    entity DAttachment                             as projection on ADD_VI.DAttachment;
    //Lane Pricing Entity Set
    entity LaneMasters                             as projection on ADD_VI.LaneMasters;
    //Material Characteristics Entity Set
    entity MaterialCharacteristicsMasters          as projection on ADD_VI.MaterialCharacteristicsMasters;

    //Test Results Entity Set
    entity TestResultsESMA                         as projection on ADD_VI.TestResultsESMA;
    //entity TestResultsTraffic as projection on ADD_VI.TestResultsTraffic;
    //Test Type Combination Entity Set
    entity TestTypeCombinationMaster               as projection on ADD_VI.TestTypeCombinationMaster;
    //vehicle Order Inspections Entity Set
    entity VehicleOrderInspections                 as projection on ADD_VI.VehicleOrderInspections;
    //vehicle Order Inspections Payment Entity Set
    // entity VehicleOrderInspectionsPaymentDetails   as projection on ADD_VI.VehicleOrderInspectionsPaymentDetails;
    //vehicle Order Inspections Details Entity Set
    entity VehicleOrderInspectionDetails           as projection on ADD_VI.VehicleOrderInspectionDetails;
    //vehicle Order Inspections Lane Change Details Entity Set
    entity VehicleOrderInspectionLaneChangeDetails as projection on ADD_VI.VehicleOrderInspectionLaneChangeDetails;
    //vehicle Order Inspections Lane Entity Set
    entity VehicleOrderInspectionLines             as projection on ADD_VI.VehicleOrderInspectionLines;
    //vehicle Order Inspections Lane Test Char Entity Set
    entity VehicleOrderInspectionLinesTestChar     as projection on ADD_VI.VehicleOrderInspectionLinesTestChar;
    //vehicle Order Inspections Change Vehicle Log Entity Set
    entity VehicleOrderInspectionChangeVehicleLog  as projection on ADD_VI.VehicleOrderInspectionChangeVehicleLog;
    //Test Results Comprehensive Entity Set
    entity TestResultsComprehensive                as projection on ADD_VI.TestResultsComprehensive;
    //Test Results Visual Entity Set
    entity TestResultsVisual                       as projection on ADD_VI.TestResultsVisual;
    //Test Results Visual Detail Entity Set
    entity TestResultsVisualDetail                 as projection on ADD_VI.TestResultsVisualDetail;
    //Over All Test Status Entity Set
    entity OverallTestStatusMaster                 as projection on ADD_VI.OverallTestStatusMaster;
    //ANPR Capture Entity Set
    entity AnprRecaptureMaster                     as projection on ADD_VI.AnprRecaptureMaster;
    // Plate ATT Entity Set
    entity PlateATTMasters                         as projection on ADD_VI.PlateATTMasters;
    // Re Embossing Number Entity Set
    entity ReEmbossNum                             as projection on ADD_VI.ReEmbossNum;
    //Fresh Test Entity Set
    entity MahaConfigurations                      as projection on ADD_VI.MahaConfigurations;
    //Test Results Permit  Entity Set
    entity TestResultsPermit                       as projection on ADD_VI.TestResultsPermit;
    //Test EmployeeMaster  Entity Set
    entity EmployeeMaster                          as projection on ADD_VI.EmployeeMaster;
    //testResMahaFileDtl Entity Set
    entity testResMahaFileDtl                      as projection on ADD_VI.testResMahaInDtl;
    //testResMahaOutDtl Entity Set
    entity testResMahaOutFileDtl                   as projection on ADD_VI.testResMahaOutDtl;
    //testResMahaOutDtl Entity Set
    entity testMahaOutResult                       as projection on ADD_VI.testMahaOutResult;
    //PaymentDocs Entity Set
    entity PaymentSet                              as projection on ADD_VI.PaymentDocs;
    // Payment Item Detail Set
    entity PaymentItemSet                          as projection on ADD_VI.PaymentItemSet;
    //MOPMaster Entity Set
    entity MOPTypesSet                             as projection on ADD_VI.MopMaster;
    //ReTestMasterTest Entity Set
    entity ReTestMaster                            as projection on ADD_VI.ReTestMasters;
    //ReTestMasterTest Entity Set
    entity RegionMasters                           as projection on ADD_VI.RegionMasters;
    //ReTestMasterTest Entity Set
    entity SalesAreaMasters                        as projection on ADD_VI.SalesAreaMasters;
    //ReTestMasterTest Entity Set
    entity plantAuthorizationMaster                as projection on ADD_VI.plantAuthorizationMaster;
    //Country Extension Entity Set
    entity CountryExtensionMasters                 as projection on ADD_VI.CountryExtensionMasters;

    //Modified header Entity Set
    entity TestResultsModifiedHeader               as projection on ADD_VI.TestResultsModifiedHeader;
    //Modified Detail Entity Set
    entity TestResultsModifiedDetail               as projection on ADD_VI.TestResultsModifiedDetail;
    //HorsePower Stage Masters Set
    entity HorsePowerStageMasters                  as projection on ADD_VI.HorsePowerStageMasters;
    //Overall Stage Masters Set
    entity OverallStageStatusMasters               as projection on ADD_VI.OverallStageStatusMasters;
    //Permit Combination Masters Set
    entity PermitCombinationMasters                as projection on ADD_VI.PermitCombinationMasters;
    //Modify Stage Masters Set
    entity ModifyStageMasters                      as projection on ADD_VI.ModifyStageMasters;
    // modified attachment set
    entity TestResModifiedAttachs                  as projection on ADD_VI.TestResModifiedAttachs;
    // Test Result Approval History Table.
    entity TestResultApprovalHistory               as projection on ADD_VI.InspectionLinesApprovalHistory;
    //Test Type Entity Set
    entity TestTypeMasters                         as projection on ADD_VI.TestTypeMasters;

    //VehicleTypeMasterSyncLog Set
    entity VehicleTypeMasterSyncLog                as projection on ADD_VI.VehicleTypeMasterSyncLog;
    //VehicleTypeMasterSyncLog Set
    entity RefundReasonMasters                as projection on ADD_VI.RefundReasonMasters;

    //** VehicleInspection Plants Entity Set */
    entity VehicleInspectionPlantsSet @(restrict: [{
        grant: ['READ'],
        to   : 'VEHICLEINSPECTION_SITE',
        where: 'plantCode = $user.Site'
    }])                                            as projection on ADD_VI.PlantMasters;

    //Shift Master Entity Set
    entity ShiftMaster                             as projection on ADD_VI.ShiftMaster;
    /** Action to get ITC Mobility Vehicle */
    action   getVehicleDetailsFromITC(Payload: ADD_VI.VehicleDetails)                                                                                                                                returns array of VehicleMasters;

    /** Action to get BTP Vehicle  */
    action   getVehicleDetailsFromBTP(FilterDetail {
        PlateNo           : String;
        PlateColorCode    : Int64;
        PlateKindCode     : Int64;
        PlateSourceCode   : Int64;
        ChassisNo         : String;
        CertificateCenter : String;
        CertificateNumber : String;
        CertificateDate   : DateTime;

    })                                                                                                                                                                                               returns array of VehicleMasters;

    /** Action to Patch ITC Vehicle Detail */
    action   updateTestResult(Payload: ADD_VI.setInspectionResult)                                                                                                                                   returns array of String;
    /** Action to Material price Detail */
    action   MaterialPriceDetail(sOderdate: String, sPlantCode: String)                                                                                                                              returns array of String;

    /** Action to Call SP */
    action   MaterialProcedure(sValidFrom: Date)                                                                                                                                                     returns array of String;
    /** Action to Generate to MAHA ES IN */
    action   MahaEsInGenerate(VehicleOrderInspectionLinesTestCharUUID: String, plantCode: String, serviceRequestNo: Integer, orderLineNo: Integer, vehicleDetails: VehicleMasters)                   returns array of ADD_VI.ResponseStatus;
    /** Action to Vehicle Reference*/
    action   VehicleReference()                                                                                                                                                                      returns array of String;
    /** Action to get comprehensive data*/
    action   fetchComprehensiveData()                                                                                                                                                                returns String;

    /** Action to get comprehensive data*/
    action   fetchModifiedData()                                                                                                                                                                     returns String;


    /** Action to get Traffic data */
    action   fetchTrafficData()                                                                                                                                                                      returns String;
    /** Action to get Traffic data by id */
    action   getTestResultTrafficById(VehicleOrderInspectionLinesTestCharUUID: String)                                                                                                               returns array of Header;
    /** Action to get Comprehensive By Id */
    action   getTestResultComprehensiveById(VehicleOrderInspectionLinesTestCharUUID: String)                                                                                                         returns array of Header;
    /** Action to get Modified By Id */
    action   getTestResultModifiedById(VehicleOrderInspectionLinesTestCharUUID: String)                                                                                                              returns array of Header;
    /** Action to preview TestCertificate */
    action   previewTestCertificate(attachmentGuId: UUID, serviceRequestNo: String, plateNo: String, chasisNumber: String, testName: String, orderLineNo: String, vehicleOrderInspectionLines: UUID) returns String;
    /** Action to get Attachment By UUID */
    action   getAttachmentByGuid(attachmentGuId: UUID)                                                                                                                                               returns String;
    /** Action to Update Vehcle Makes */
    action   updateVehicleMakesInBTPFromITC()                                                                                                                                                        returns String;
    /** Action to Update Vehcle Models */
    action   updateVehicleModelsInBTPFromITC()                                                                                                                                                       returns String;

    /** Action to Update Vehcle Kinds */
    action   updateVehicleKindsInBTPFromITC()                                                                                                                                                        returns array of String;
    /** Action to Update Vehcle Kinds */
    action   updateVehicleTypesInBTPFromITC()                                                                                                                                                        returns array of String;
    /** Action to Update Vehcle Colors */
    action   updateVehicleColorsInBTPFromITC()                                                                                                                                                       returns array of String;
    /** Action to update Trf Nationalities */
    action   updateTrfNationalitiesInBTPFromITC()                                                                                                                                                    returns array of String;
    /** Action to Update Vehicle Gears */
    action   updateVehicleGearsInBTPFromITC()                                                                                                                                                        returns array of String;
    /** Action to Update Vehicle Weights */
    action   updateVehicleWeightsInBTPFromITC()                                                                                                                                                      returns array of String;
    /** Action to Update Vehicle Steerings */
    action   updateVehicleSteeringsInBTPFromITC()                                                                                                                                                    returns array of String;
    /** Action to Update Vehicle Fuels */
    action   updateVehicleFuelsInBTPFromITC()                                                                                                                                                        returns array of String;
    /** Action to Update Vehicle Sources */
    action   updateVehiclePlateSourcesInBTPFromITC()                                                                                                                                                 returns array of String;
    /** Action to Update Vehicle Colors */
    action   updateVehiclePlateColorsInBTPFromITC()                                                                                                                                                  returns array of String;
    /** Action to Update Vehicle Kinds */
    action   updateVehiclePlateKindsInBTPFromITC()                                                                                                                                                   returns array of String;
    /** Action to Update Vehicle Types */
    action   updateVehiclePlateTypesInBTPFromITC()                                                                                                                                                   returns array of String;
    /** Action to Update Vehicle Remarks */
    action   updateRegCardRemarksInBTPFromITC()                                                                                                                                                      returns array of String;
    /** Action to Update Vehicle Places */
    action   updatePlateAttPlacesInBTPFromITC()                                                                                                                                                      returns array of String;
    /** Action to Update Vehicle Centers */
    action   updateVehicleInspectionCentersInBTPFromITC()                                                                                                                                            returns array of String;
    /** Action to Update Vehicle Refences */
    action   updateVehicleRefencesInBTPFromITC()                                                                                                                                                     returns array of String;
    /** function to Update Vehicle Masters */
    function updateMasterDataInBtpFromITC()                                                                                                                                                          returns array of String;
    /** Action to Get Visual Data */
    action   fetchVisualData()                                                                                                                                                                       returns String;
    /** Action to generate ES Out Service */
    action   ESOutService(siteCode: String, fileName: String, base64Data: String)                                                                                                                    returns array of ADD_VI.ESOutResponse;
    /** Action to Get ANPR Recapture*/
    action   AnprRecapture(cameraNumber: String, sectionId: String, siteId: String)                                                                                                                  returns String;
    /** Action to Send SMS*/
    action   sendSMS(mobile_numbers: array of String, message_body: String)                                                                                                                          returns array of String;

    /** function to AD Police Reference Number*/
    function processLineItemsForAcknowledgement()                                                                                                                                                    returns array of String;
    /** Action to Send Mail*/
    action   sendMail(email_address: String, email_body: String, email_subject: String)                                                                                                              returns array of String;

    /** Action to Upload Attachment*/
    action   uploadAttachment(Files: array of {
        attachmentGuId   : UUID;
        attachmentName   : String;
        orgFileName      : String;
        orgFileExtension : String;
        docType          : Integer;
        docId            : Integer;
        docGuid          : UUID;
        base64File       : LargeBinary;
    })                                                                                                                                                                                               returns array of DAttachment;

    /** Action to Update Attachment Document UUID*/
    action   updateAttachmentDocGuid(Files: array of {
        attachmentGuId : UUID;
        docGuid        : UUID;
    })                                                                                                                                                                                               returns String;

    /** Action to Delete Attachment By UUID */
    action   deleteAttachmentFromDMS(Files: array of {
        attachmentGuId : UUID;
    })                                                                                                                                                                                               returns String;

    /** Action to Over All Status*/
    action   overAllStatus(Payload: array of {
        applicableTestName : String;
        Status             : String;
        WithoutRegis       : Boolean;
    })                                                                                                                                                                                               returns array of OverallTestStatusMaster;

    /** Action to Get Material Price Details*/
    function getMaterialPriceDetails(sCurDate: String, sPlantCode: String)                                                                                                                           returns array of MaterialMasters;
    /** Action to Delete Test Result Comprehensive*/
    function deleteTestResultComprehensive(sVehicleOrderInspectionLinesTestCharGUID: String)                                                                                                         returns array of String;
    /** Action to Get Orders For Retest*/
    function getOrdersForRetest(sOrderNo: String, sPlateNo: String, sMobileNo: String, sPlateSourceCode: String, sPlateColorCode: String, sPlateKindCode: String)                                    returns array of VehicleOrderInspections;

    /** Action to Get Material Price Details*/
    action   getMaterialDetails(sCurDate: String,
                                sPlantCode: String,
                                sTestType: String,
                                sDstributionChannel: String,
                                sSalesOrganization: String,
                                sRegion: String,
                                sListType: String,
                                sFromTime: String,
                                sToTime: String,
                                sPlateSource: String,
                                sVehicleType: Int16,
                                sVehicleYear: String,
                                sPlateNumber: String,
                                oFilter: array of {
        orderNo          : String;
        plateNumber      : String;
        orderDate        : String;
        plateColor       : String;
        plateKind        : String;
        mobileNo         : String;
        plateSource      : String;
        serviceCode      : String;
        serviceName      : String;
        maxTestEndDate   : String;
        servicerequestNo : String;
    })                                                                                                                                                                                               returns array of MaterialMasters;

    /** Action to update all VehicleDetails via ITC*/
    action   updateAllVehcleLookups()

    /** function to add shift Details*/ returns array of String;

    function addShiftDetails()                                                                                                                                                                       returns array of String;

    /*Send Loyalty Sales*/
    action   fetchInputDetails(Payload: {
        comment         : String;
        partner         : String;
        location        : String;
        date            : Date;
        burnPoints      : Int64;
        burnPointsMoney : Decimal;
        retroclaimed    : Boolean;
        currencyCode    : String;
        amount          : Decimal;
        paymentMethod   : String;
        paymentMethods  : array of {
            amount : Decimal;
            code   : String;
        };
        trnNo           : String;
        coupons         : array of String;
        lineOfBusiness  : String;
        businessDate    : String;
        products        : array of {
            code       : String;
            lineNo     : Int16;
            category   : String;
            name       : String;
            quantity   : Int32;
            amount     : Decimal;
            discounted : Boolean;
        }
    },
                               loyaltyID: String,
                               simulation: Boolean)                                                                                                                                                  returns array of ADD_VI.SendLoyaltySales;

    /** Function to fetch Loyalty Detail */
    function fetchLoyaltyDetails(input: String)                                                                                                                                                      returns array of ADD_VI.fetchLoyaltyDetails;

    /** Action to update Order for Retest  */
    action   executeMahaTests(aPrevServiceRequestNos: array of String,
                              aChildData: array of {
        currMaterialCode                : Int32;
        currOrderLineNo                 : Int32;
        currVehicleOrderInspectionUUID  : String;
        currServiceRequestNo            : Integer64;
        currVehicleOrderInspectionLines : String;
        currTestType                    : String;
        prevVehicleOrderInspectionLines : String;
        prevTestType                    : String;
        prevServiceRequestNo            : Integer64;


    })                                                                                                                                                                                               returns array of String;

    function employeePasswordNotification()                                                                                                                                                          returns array of String;
    function modifiedADMobility()                                                                                                                                                                    returns array of String;

    function mahaSendPwdFile()                                                                                                                                                                       returns array of String;

    /** Function to get Customer Details */

    action getP24CustomerDetail(
         crmid: String,
         tokenNumber: String,
         customerId: String,
         vehicleReg :{
            plate:  String;
			source:  Int16;
			color:  Int16;
			kind:  Int16;
         })
        returns array of ADD_VI.getP24CustomerDetail;

    /** Action to get Payment Details */
    action   getPaymentP24(Payload: {
        merchantNumber   : String;
        totalAmount      : Decimal;
        odometerReading  : String;
        dateTime         : String;
        referencenumber  : String;
        product          : array of {
            amount        : Decimal;
            productCode   : String;
            productName   : String;
            quantity      : Int32;
            vatAmount     : Decimal;
            vatPercentage : Int32;
        };
        customer         : {
            tokenNumber : String;
        };
        type             : String;
        validationRules  : {
            validateProduct : Boolean;
        };
        businessDateTime : String;

    })                                                                                                                                                                                               returns array of ADD_VI.getPaymentP24;

    function customerNotification()                                                                                                                                                                  returns String;
    function FetchSideCenter(PlantCode: String)                                                                                                                                                      returns plantAuthorizationMaster;
    function sendShorySmsNotificationForPreInspection()                                                                                                                                              returns array of String;
    function sendShorySmsNotificationForInspection()                                                                                                                                                 returns array of String;


    function getKey()                                                                                                                                                                                returns array of ADD_VI.getKey;
    action   updateMasterDataInBtpFromITCallselected()                                                                                                                                               returns array of String;
    function createCustomerFromBtpToSap()                                                                                                                                                            returns array of String;
    function delImageCertificateFromDms()                                                                                                                                                            returns array of String;

    action   GetDataFromITCForCertificateInfo(Payload: {
        CertificateNo    : String;
        IsRTACertificate : Boolean;
        SystemCode       : Int64;
        UserID           : String;
    })                                                                                                                                                                                               returns array of String;

    action   GetDataFromITCForCustomsCertificate(Payload: {
        CertificateID : {
            CertificateNo         : Int64;
            CertificateDate       : DateTime;
            CertificateCenterCode : Int32;
        };
        SystemCode    : Int32;
        UserID        : String;
    })                                                                                                                                                                                               returns array of String;

    function syncOrderBTPToS4hana(senario: String)                                                                                                                                                   returns String;
    function syncOrderBTPToS4hanaCron(senario: String)                                                                                                                                               returns String;
    action   syncSingleCustomerOrder(serviceRequestNo: String)                                                                                                                                       returns String;

    action   GetOverAllTestStatus(Payload: array of {
        applicableTestName : String;
        Status             : String
    });

    //## Approval Flow and Customer Portal - Trupti  - below
    action   AssignToAnotherUser(workflowContext: ADD_VI.workflowContext)                                                                                                                            returns String;
    action   getSOVehicleData_CP(serviceRequestNo: String, sPlateNo: String)                                                                                                                         returns String;
    action   sendRequestForApproval(workflowContext: ADD_VI.workflowContext)                                                                                                                         returns String;
    action   UpdateApprovalRequest(workflowContexts: many ADD_VI.workflowContext)                                                                                                                    returns String;
    action   ApproveApprovalRequest_AP(workflowContexts: many ADD_VI.workflowContext)                                                                                                                returns String;
    //action sendNewOrderForApproval_AP(workflowContext: ADD_VI.workflowContext) returns String;
    function getOpenTasksForUser()                                                                                                                                                                   returns array of String;
    //action sendExistingOrderForApproval_AP(workflowContext: ADD_VI.workflowContext) returns String;
    action   SendOrderApprovalRequest_AP(vehTestCharid: String, processWorkflowInstanceId: String, currTaskInstanceId: String, pendingWithUser: String)                                              returns String;
    action   RejectApprovalRequest_AP(workflowContexts: many ADD_VI.workflowContext)                                                                                                                 returns String;
    //## Approval Flow and Customer Portal - Trupti  - above
    function syncMasterDataInBtpFromITC()                                                                                                                                                            returns String;

    function getOrdersForRetesttest(sOrderNo: String, sPlateNo: String, sMobileNo: String, sPlateSourceCode: String, sPlateColorCode: String, sPlateKindCode: String)                                returns array of VehicleOrderInspections;

   
    function getUserInfo() returns ADD_VI.userInfo;

    function getCustomerDetails(sCustomerName : String, sCustomerMobile : String, sCustomerEmail : String) returns ADD_VI.getCustomers;

    action printTaxInvoiceCertificate(serviceRequestNo: String) returns String ; 
    action reprintSMS(serviceRequestNo:String) returns array of String;
    function syncReturnOrderBTPToS4hana(senario: String) returns String;
}
