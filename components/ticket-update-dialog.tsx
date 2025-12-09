"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { CancelDialog } from "./activity-cancel-dialog";
import { TicketSheet } from "./sheet-ticket";

interface Activity {
  _id: string;
  ticket_reference_number: string;
  client_segment: string;
  traffic: string;
  source_company: string;
  ticket_received: string;
  ticket_endorsed: string;
  channel: string;
  wrap_up: string;
  source: string;
  customer_type: string;
  customer_status: string;
  status: string;
  department: string;
  manager: string;
  agent: string;
  remarks: string;
  inquiry: string;
  item_code: string;
  item_description: string;
  po_number: string;
  so_date: string;
  so_number: string;
  so_amount: string;
  qty_sold: string;
  quotation_number: string;
  quotation_amount: string;
  payment_terms: string;
  po_source: string;
  payment_date: string;
  delivery_date: string;
  date_created: string;
  date_updated: string;
}

interface UpdateActivityDialogProps {
  onCreated: (newActivity: Activity) => void;
  _id: string;
  ticket_reference_number: string;
  referenceid: string;
  type_client: string;
  contact_number: string;
  email_address: string;
  contact_person: string;
  address: string;
  company_name: string;
  account_reference_number: string;
  ticket_received?: string;
  ticket_endorsed?: string;
  traffic?: string;
  source_company?: string;
  channel?: string;
  wrap_up?: string;
  source?: string;
  customer_type?: string;
  customer_status?: string;
  status?: string;
  department?: string;
  manager?: string;
  agent?: string;
  remarks?: string;
  inquiry?: string;
  item_code?: string;
  item_description?: string;
  po_number?: string;
  so_date?: string;
  so_number?: string;
  so_amount?: string;
  qty_sold?: string;
  quotation_number?: string;
  quotation_amount?: string;
  payment_terms?: string;
  po_source?: string;
  payment_date?: string;
  delivery_date?: string;
  date_created?: string;
}

function SpinnerEmpty({ onCancel }: { onCancel?: () => void }) {
  return (
    <Empty className="w-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>Processing your request</EmptyTitle>
        <EmptyDescription>
          Please wait while we process your request. Do not refresh the page.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function generateTicketReferenceNumber() {
  const randomNumber = Math.floor(Math.random() * 10 ** 11); // 11 digits max
  const paddedNumber = randomNumber.toString().padStart(11, "0");
  return `CSR-Ticket-${paddedNumber}`;
}

export function UpdateTicketDialog({
  onCreated,
  _id,
  ticket_reference_number,
  referenceid,
  type_client,
  contact_number,
  company_name,
  contact_person,
  email_address,
  address,
  account_reference_number,
  ticket_received,
  ticket_endorsed,
  traffic,
  source_company,
  channel,
  wrap_up,
  source,
  customer_type,
  customer_status,
  status,
  department,
  manager,
  agent,
  remarks,
  inquiry,
  item_code,
  item_description,
  po_number,
  so_date,
  so_number,
  so_amount,
  qty_sold,
  quotation_number,
  quotation_amount,
  payment_terms,
  po_source,
  payment_date,
  delivery_date,
  date_created,
}: UpdateActivityDialogProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [step, setStep] = useState(1);

  const [activityRef, setActivityRef] = useState(_id);
  const [ticketReferenceNumber, setTicketReferenceNumber] = useState("");
  const [clientSegment, setClientSegment] = useState("");
  const [trafficState, setTraffic] = useState("");
  const [sourceCompanyState, setSourceCompany] = useState("");
  const [ticketReceivedState, setTicketReceived] = useState("");
  const [ticketEndorsedState, setTicketEndorsed] = useState("");
  const [channelState, setChannel] = useState("");
  const [wrapUpState, setWrapUp] = useState("");
  const [sourceState, setSource] = useState("");
  const [customerTypeState, setCustomerType] = useState("");
  const [customerStatusState, setCustomerStatus] = useState("");
  const [statusState, setStatus] = useState("");
  const [departmentState, setDepartment] = useState("");
  const [managerState, setManager] = useState("");
  const [agentState, setAgent] = useState("");
  const [remarksState, setRemarks] = useState("");
  const [inquiryState, setInquiry] = useState("");
  const [itemCodeState, setItemCode] = useState("");
  const [itemDescriptionState, setItemDescription] = useState("");
  const [poNumberState, setPoNumber] = useState("");
  const [soDateState, setSoDate] = useState("");
  const [soNumberState, setSoNumber] = useState("");
  const [soAmountState, setSoAmount] = useState("");
  const [quotationNumberState, setQuotationNumber] = useState("");
  const [quotationAmountState, setQuotationAmount] = useState("");
  const [qtySoldState, setQtySold] = useState("");
  const [paymentTermsState, setPaymentTerms] = useState("");
  const [poSourceState, setPoSource] = useState("");
  const [paymentDateState, setPaymentDate] = useState("");
  const [deliveryDateState, setDeliveryDate] = useState("");
  const [dateCreatedState, setDateCreated] = useState("");

  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    setActivityRef(_id || "");
    setClientSegment(type_client || "");
    setTraffic(traffic || "");
    setSourceCompany(source_company || "");
    setTicketReceived(ticket_received || "");
    setTicketEndorsed(ticket_endorsed || "");
    setChannel(channel || "");
    setWrapUp(wrap_up || "");
    setSource(source || "");
    setCustomerType(customer_type || "");
    setCustomerStatus(customer_status || "");
    setStatus(status || "");
    setDepartment(department || "");
    setManager(manager || "");
    setAgent(agent || "");
    setRemarks(remarks || "");
    setInquiry(inquiry || "");
    setItemCode(item_code || "");
    setItemDescription(item_description || "");
    setPoNumber(po_number || "");
    setSoDate(so_date || "");
    setSoNumber(so_number || "");
    setSoAmount(so_amount || "");
    setQuotationNumber(quotation_number || "");
    setQuotationAmount(quotation_amount || "");
    setQtySold(qty_sold || "");
    setPaymentTerms(payment_terms || "");
    setPoSource(po_source || "");
    setPaymentDate(payment_date || "");
    setDeliveryDate(delivery_date || "");
    setDateCreated(date_created || "");
  }, [
    _id,
    type_client,
    traffic,
    source_company,
    ticket_received,
    ticket_endorsed,
    channel,
    wrap_up,
    source,
    customer_type,
    customer_status,
    status,
    department,
    manager,
    agent,
    remarks,
    inquiry,
    item_code,
    item_description,
    po_number,
    so_date,
    so_number,
    so_amount,
    quotation_number,
    quotation_amount,
    qty_sold,
    payment_terms,
    po_source,
    payment_date,
    delivery_date,
    date_created,
  ]);

  useEffect(() => {
    setDateCreated(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (ticket_reference_number) {
      setTicketReferenceNumber(ticket_reference_number);
    } else {
      // Auto generate if empty
      setTicketReferenceNumber(generateTicketReferenceNumber());
    }
  }, [ticket_reference_number]);


  const handleUpdate = async () => {
    setLoading(true);

    const newActivity: Activity = {
      _id: activityRef,
      ticket_reference_number: ticketReferenceNumber,
      client_segment: clientSegment,
      traffic: trafficState,
      source_company: sourceCompanyState,
      ticket_received: ticketReceivedState,
      ticket_endorsed: ticketEndorsedState,
      channel: channelState,
      wrap_up: wrapUpState,
      source: sourceState,
      customer_type: customerTypeState,
      customer_status: customerStatusState,
      status: statusState,
      department: departmentState,
      manager: managerState,
      agent: agentState,
      remarks: remarksState,
      inquiry: inquiryState,
      item_code: itemCodeState,
      item_description: itemDescriptionState,
      po_number: poNumberState,
      so_date: soDateState,
      so_number: soNumberState,
      so_amount: soAmountState,
      quotation_number: quotationNumberState,
      quotation_amount: quotationAmountState,
      qty_sold: qtySoldState,
      payment_terms: paymentTermsState,
      po_source: poSourceState,
      payment_date: paymentDateState,
      delivery_date: deliveryDateState,
      date_created: dateCreatedState,
      date_updated: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/act-save-activity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActivity),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to save activity.");
        setLoading(false);
        return;
      }

      if (statusState === "Endorsed") {
        const endorsedData = {
          account_reference_number,
          company_name,
          contact_person,
          contact_number,
          email_address,
          address,
          ticket_reference_number: ticketReferenceNumber,
          wrap_up: wrapUpState,
          inquiry: inquiryState,
          manager: managerState,
          agent: agentState,
        };

        const endorsedRes = await fetch("/api/act-endorsed-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(endorsedData),
        });

        if (!endorsedRes.ok) {
          const err = await endorsedRes.json();
          toast.error(err.error || "Failed to save endorsed ticket.");
          setLoading(false);
          return;
        }
      }

      toast.success("Activity saved successfully!");
      onCreated(newActivity);
      setStep(1);
      setSheetOpen(false);
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSheetOpenChange = (open: boolean) => {
    if (!open) {
      setShowConfirmCancel(true);
    } else {
      setSheetOpen(true);
    }
  };

  const confirmCancel = () => {
    setShowConfirmCancel(false);
    setSheetOpen(false);
  };

  const cancelCancel = () => {
    setShowConfirmCancel(false);
    setSheetOpen(true);
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <SheetTrigger asChild>
          <Button type="button" variant="secondary" onClick={() => setSheetOpen(true)}>
            Update
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          style={{ width: "500px", maxWidth: "none" }}
          className="overflow-auto custom-scrollbar"
        >
          <SheetHeader>
            <SheetTitle>Update Activity</SheetTitle>
            <SheetDescription>Fill out the steps to update activity.</SheetDescription>
          </SheetHeader>

          {/* Progress Steps */}
          <div className="flex items-center mb-6">
            {[1, 2, 3, 4, 5, 6].map((s, i, arr) => {
              const isActive = step === s;
              const isCompleted = step > s;

              return (
                <React.Fragment key={s}>
                  <div
                    className="flex flex-col items-center relative flex-1 cursor-pointer"
                    onClick={() => setStep(s)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setStep(s);
                      }
                    }}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`Step ${s}: ${s === 1 ? "Traffic" :
                      s === 2 ? "Department" :
                        s === 3 ? "Ticket" :
                          s === 4 ? "Customer" :
                            s === 5 ? "Status" :
                              "Assignee"
                      }`}
                  >
                    <div
                      className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold z-10
              ${isActive ? "bg-blue-600" : isCompleted ? "bg-green-500" : "bg-gray-300"}
              hover:brightness-90 transition
            `}
                    >
                      {s}
                    </div>
                    <span className="mt-2 text-xs text-center max-w-[70px]">
                      {s === 1 && "Traffic"}
                      {s === 2 && "Department"}
                      {s === 3 && "Ticket"}
                      {s === 4 && "Customer"}
                      {s === 5 && "Status"}
                      {s === 6 && "Assignee"}
                    </span>

                    {i !== arr.length - 1 && (
                      <div
                        className={`absolute top-5 right-[-50%] w-full h-1 ${step > s ? "bg-green-500" : "bg-gray-300"
                          }`}
                        style={{ zIndex: 0 }}
                      />
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {loading ? (
            <SpinnerEmpty onCancel={() => setSheetOpen(false)} />
          ) : (
            <div className="p-4 grid gap-6">
              {/* Step 1: Traffic */}
              {step === 1 && (
                <div>
                  <FieldGroup>
                    <FieldSet>
                      <FieldLabel>Choose Traffic</FieldLabel>
                      <RadioGroup
                        defaultValue={trafficState}
                        onValueChange={(value) => {
                          setTraffic(value);
                          setStartDate(new Date().toISOString());
                        }}
                      >
                        <FieldLabel>
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Sales</FieldTitle>
                              <FieldDescription>Make outgoing calls or sales interactions.</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value="Sales" />
                          </Field>
                        </FieldLabel>

                        <FieldLabel>
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Non-Sales</FieldTitle>
                              <FieldDescription>Handle general inquiries or assistance.</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value="Non-Sales" />
                          </Field>
                        </FieldLabel>
                      </RadioGroup>
                    </FieldSet>
                  </FieldGroup>

                  <FieldGroup>
                    <FieldSet>
                      <FieldLabel className="mt-4">Choose Company</FieldLabel>
                      <RadioGroup
                        defaultValue={sourceCompanyState}
                        onValueChange={(value) => {
                          setSourceCompany(value);
                          setStartDate(new Date().toISOString());
                        }}
                      >
                        <FieldLabel>
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Ecoshift Corporation</FieldTitle>
                              <FieldDescription>
                                The Fastest-Growing Provider of Innovative Lighting Solutions
                              </FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value="Ecoshift Corporation" />
                          </Field>
                        </FieldLabel>

                        <FieldLabel>
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Disruptive Solutions Inc</FieldTitle>
                              <FieldDescription>
                                Future-ready lighting solutions that brighten spaces, cut costs, and power smarter business
                              </FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value="Disruptive Solutions Inc" />
                          </Field>
                        </FieldLabel>

                        <FieldLabel>
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Buildchem Solutions</FieldTitle>
                              <FieldDescription>
                                Manufactures high-performance chemical products for the building and infrastructure sectors.
                              </FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value="Buildchem Solutions" />
                          </Field>
                        </FieldLabel>
                      </RadioGroup>
                    </FieldSet>
                  </FieldGroup>

                  <Button className="mt-4 w-full" onClick={() => setStep(2)}>
                    Next
                  </Button>
                </div>
              )}

              {/* Steps 2 - 6: TicketSheet */}
              {(trafficState === "Sales" || trafficState === "Non-Sales") && (
                <TicketSheet
                  step={step}
                  setStep={setStep}
                  ticketReceived={ticketReceivedState}
                  setTicketReceived={setTicketReceived}
                  ticketEndorsed={ticketEndorsedState}
                  setTicketEndorsed={setTicketEndorsed}
                  channel={channelState}
                  setChannel={setChannel}
                  wrapUp={wrapUpState}
                  setWrapUp={setWrapUp}
                  source={sourceState}
                  setSource={setSource}
                  customerType={customerTypeState}
                  setCustomerType={setCustomerType}
                  customerStatus={customerStatusState}
                  setCustomerStatus={setCustomerStatus}
                  status={statusState}
                  setStatus={setStatus}
                  department={departmentState}
                  setDepartment={setDepartment}
                  manager={managerState}
                  setManager={setManager}
                  agent={agentState}
                  setAgent={setAgent}
                  remarks={remarksState}
                  setRemarks={setRemarks}
                  inquiry={inquiryState}
                  setInquiry={setInquiry}
                  itemCode={itemCodeState}
                  setItemCode={setItemCode}
                  itemDescription={itemDescriptionState}
                  setItemDescription={setItemDescription}
                  poNumber={poNumberState}
                  setPoNumber={setPoNumber}
                  soDate={soDateState}
                  setSoDate={setSoDate}
                  soNumber={soNumberState}
                  setSoNumber={setSoNumber}
                  soAmount={soAmountState}
                  setSoAmount={setSoAmount}
                  quotationNumber={quotationNumberState}
                  setQuotationNumber={setQuotationNumber}
                  quotationAmount={quotationAmountState}
                  setQuotationAmount={setQuotationAmount}
                  qtySold={qtySoldState}
                  setQtySold={setQtySold}
                  paymentTerms={paymentTermsState}
                  setPaymentTerms={setPaymentTerms}
                  poSource={poSourceState}
                  setPoSource={setPoSource}
                  paymentDate={paymentDateState}
                  setPaymentDate={setPaymentDate}
                  deliveryDate={deliveryDateState}
                  setDeliveryDate={setDeliveryDate}
                  dateCreated={dateCreatedState}
                  setDateCreated={setDateCreated}
                  loading={loading}
                  handleBack={() => setStep((prev) => prev - 1)}
                  handleNext={() => setStep((prev) => prev + 1)}
                  handleUpdate={handleUpdate}
                />
              )}
            </div>
          )}

          {showConfirmCancel && (
            <CancelDialog onCancel={cancelCancel} onConfirm={confirmCancel} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
