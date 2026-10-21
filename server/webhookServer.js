require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.WEBHOOK_PORT || 3000;

// Crucial: Razorpay sends a raw string payload. Do NOT use express.json() 
// globally before verifying the signature, as it mutates the raw body bytes.
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
    
    // 1. Retrieve the incoming signature from headers
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET; // Set in your live environment variables

    if (!webhookSecret) {
        console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET is not configured in environment variables.');
    }

    // 2. Cryptographically verify the payload signature
    if (webhookSecret) {
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(req.body);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== signature) {
            console.error('⚠️ Unauthorized: Invalid Webhook Signature detected.');
            return res.status(400).send('Invalid signature');
        }
    }

    // 3. Signature is valid. Parse the safe body safely.
    let payload;
    try {
        payload = JSON.parse(req.body.toString());
    } catch (parseErr) {
        console.error('Failed to parse webhook JSON body:', parseErr);
        return res.status(400).send('Malformed JSON');
    }

    const event = payload.event;
    console.log(`📩 Received Razorpay webhook event: ${event}`);

    // 4. Handle successful capture event
    if (event === 'payment.captured') {
        const paymentData = payload.payload?.payment?.entity || {};
        const orderId = paymentData.order_id;       // The unique id mapped in your DB
        const paymentId = paymentData.id;           // The specific transaction id
        const userEmail = paymentData.email;

        try {
            // Check your database to ensure this paymentId hasn't been processed yet (Idempotency check)
            const isAlreadyProcessed = await checkPaymentStatusInDB(paymentId);
            if (isAlreadyProcessed) {
                console.log(`ℹ️ Payment ${paymentId} already processed. Skipping duplicate fulfillment.`);
                return res.status(200).send('OK - Already Processed');
            }

            // 5. Query your database by orderId to know EXACTLY what product to deliver
            const orderDetails = await getOrderDetailsFromDB(orderId);
            
            // 6. Automatically unlock or ship the specific inventory item to the user
            await deliverProduct(orderDetails.userId, orderDetails.productId);

            // Update transaction logs in your DB to mark this paymentId as FULFILLED
            await markPaymentAsProcessedInDB(paymentId, 'success');
            console.log(`✅ Payment ${paymentId} successfully processed for order ${orderId}`);

        } catch (error) {
            console.error('Database/Fulfillment error:', error);
            // Return a 500 status code if your internal server fails. 
            // The payment gateway will retry sending the webhook automatically later.
            return res.status(500).send('Internal Server Error');
        }
    }

    // Always respond with a 200 OK to tell the gateway you received the webhook safely
    res.status(200).send('OK');
});

// Mock database abstractions for structural understanding
async function checkPaymentStatusInDB(paymentId) { /* Check if fulfilled */ return false; }
async function getOrderDetailsFromDB(orderId) { /* Return { userId, productId } */ return { userId: 'usr_99', productId: 'prod_abc' }; }
async function deliverProduct(userId, productId) { /* Trigger asset delivery or email licenses */ console.log(`📦 Fulfilling product ${productId} for user ${userId}`); }
async function markPaymentAsProcessedInDB(paymentId, status) { /* Log transaction status */ console.log(`📝 Payment ${paymentId} marked as ${status}`); }

app.listen(PORT, () => console.log(`Secure Webhook Server running on port ${PORT}`));

module.exports = app;
