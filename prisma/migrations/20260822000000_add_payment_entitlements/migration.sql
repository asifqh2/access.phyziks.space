CREATE TABLE "PaymentEntitlement" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "razorpaySubscription" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEntitlement_email_key" ON "PaymentEntitlement"("email");
CREATE UNIQUE INDEX "PaymentEntitlement_razorpaySubscription_key" ON "PaymentEntitlement"("razorpaySubscription");
