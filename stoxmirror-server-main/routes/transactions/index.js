const UsersDatabase = require("../../models/User");
var express = require("express");
var router = express.Router();
const { sendDepositEmail,sendPlanEmail} = require("../../utils");
const { sendUserDepositEmail,sendDepositApproval,sendNotifyEmail,sendUserPlanEmail,sendWalletInfo,sendWithdrawalEmail,sendWithdrawalRequestEmail,sendKycAlert} = require("../../utils");

const { v4: uuidv4 } = require("uuid");
const app=express()




router.post("/:_id/deposit", async (req, res) => {
  const { _id } = req.params;
  const { method, amount, from ,timestamp,to} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    await user.updateOne({
      transactions: [
        ...user.transactions,
        {
          _id: uuidv4(),
          method,
          type: "Deposit",
          amount,
          from,
          status:"pending",
          timestamp,
        },
      ],
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    sendDepositEmail({
      amount: amount,
      method: method,
      from: from,
      timestamp:timestamp
    });


    sendUserDepositEmail({
      amount: amount,
      method: method,
      from: from,
      to:to,
      timestamp:timestamp
    });

  } catch (error) {
    console.log(error);
  }
});

router.post("/:_id/deposit/notify", async (req, res) => {
  const { _id } = req.params;
  const { name, currency } = req.body;

  // Validate input
  if (!name || !currency) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Missing required fields: name or currency.",
    });
  }

  try {
    // Find the user
    const user = await UsersDatabase.findOne({ _id });
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    // Send success response
    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    // Send notification email
    sendNotifyEmail({
      currency: currency,
      name: name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An error occurred while processing the request.",
    });
  }
});


router.post("/:_id/plan", async (req, res) => {
  const { _id } = req.params;
  const { subname, subamount, from ,timestamp,to} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }
  try {
    // Calculate the new balance by subtracting subamount from the existing balance
    const newBalance = user.balance - subamount;

    await user.updateOne({
      planHistory: [
        ...user.planHistory,
        {
          _id: uuidv4(),
          subname,
          subamount,
          from,
          timestamp,
        },
      ],
      balance: newBalance, // Update the user's balance
    });



    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    sendPlanEmail({
      subamount: subamount,
      subname: subname,
      from: from,
      timestamp:timestamp
    });


    sendUserPlanEmail({
      subamount: subamount,
      subname: subname,
      from: from,
      to:to,
      timestamp:timestamp
    });

  } catch (error) {
    console.log(error);
  }
});


router.post("/:_id/auto", async (req, res) => {
  const { _id } = req.params;
  const { copysubname, copysubamount, from ,timestamp,to,trader,info} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }
  try {
    // Calculate the new balance by subtracting subamount from the existing balance
    // const newBalance = user.balance - copysubamount;

    await user.updateOne({
      planHistory: [
        ...user.planHistory,
        {
          _id: uuidv4(),
          subname:copysubname,
          subamount:copysubamount,
          from,
          trader,
          info,
          status:"pending",
          timestamp,
        },
      ],
      // balance: newBalance, // Update the user's balance
    });



    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    sendPlanEmail({
      subamount: copysubamount,
      subname: copysubname,
      from: from,
      trader,
      timestamp:timestamp
    });


    sendUserPlanEmail({
      subamount: copysubamount,
      subname: copysubname,
      from: from,
      to:to,
      trader,
      timestamp:timestamp
    });

  } catch (error) {
    console.log(error);
  }
});

router.post("/:_id/wallet", async (req, res) => {
  const { _id } = req.params;
  const { addy} = req.body;

  const user = await UsersDatabase.findOne({ _id });
const username=user.firstName + user.lastName
  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }
  try {
    // Calculate the new balance by subtracting subamount from the existing balance
    
    await user.updateOne({
      plan: addy, // Update the user's wallet
    });



    res.status(200).json({
      success: true,
      status: 200,
      message: "wallet was successful saved",
    });


    sendWalletInfo({
      username,
      addy,
    })
  } catch (error) {
    console.log(error);
  }
});



router.put("/:_id/transaction/:transactionId/confirm", async (req, res) => {
  const { _id, transactionId} = req.params;
  const {amount}=req.body

  try {
    // Find the user by _id
    const user = await UsersDatabase.findOne({ _id });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    // Find the deposit transaction by transactionId
    const depositsArray = user.planHistory;
    const depositsTx = depositsArray.filter((tx) => tx._id === transactionId);

    // If the transaction was not found
    if (depositsTx.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    depositsTx[0].status = "Approved";
    depositsTx[0].amount = amount;
    
    const newBalance = user.balance + amount;

    // Update user balance and transaction status
    await user.updateOne({
      transactions: [
        ...user.transactions,
        // cummulativeWithdrawalTx, // If needed, you can add logic here
      ],
      balance: newBalance,
          });

    // Send deposit approval notification (optional)
    sendDepositApproval({
      amount: depositsTx[0].amount,
      method: depositsTx[0].method,
      timestamp: depositsTx[0].timestamp,
      to: user.email, // assuming 'to' is the user's email or similar
    });

    // Return success response
    return res.status(200).json({
      message: "Transaction approved",
    });

  } catch (error) {
    console.error(error); // Log any error that occurs
    return res.status(500).json({
      message: "Oops! an error occurred",
    });
  }
});



router.put("/:_id/transaction/:transactionId/decline", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const depositsArray = user.transactions;
    const depositsTx = depositsArray.filter(
      (tx) => tx._id === transactionId
    );

    depositsTx[0].status = "Declined";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      transactions: [
        ...user.transactions
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Transaction declined",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});


router.put("/:_id/planhistory/:planId/confirm", async (req, res) => {
  
  const { _id } = req.params;
  const { planId } = req.params;
  const { copysub } = req.body;
  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const depositsArray = user.planHistory;
    const depositsTx = depositsArray.filter(
      (tx) => tx._id === planId
    );

    depositsTx[0].status = "Approved";
    const newBalance = user.balance - copysub;

    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      planHistory: [
        ...user.planHistory
        //cummulativeWithdrawalTx
      ],
      balance: newBalance,
    });

    res.status(200).json({
      message: "Transaction approved",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});

router.put("/:_id/planhistory/:planId/decline", async (req, res) => {
  
  const { _id } = req.params;
  const { planId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const depositsArray = user.planHistory;
    const depositsTx = depositsArray.filter(
      (tx) => tx._id === planId
    );

    depositsTx[0].status = "Declined";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      planHistory: [
        ...user.planHistory
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Transaction declined",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});





router.get("/:_id/deposit/history", async (req, res) => {
  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    res.status(200).json({
      success: true,
      status: 200,
      data: [...user.transactions],
    });

  
  } catch (error) {
    console.log(error);
  }
});


router.get("/:_id/deposit/plan/history", async (req, res) => {
  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    res.status(200).json({
      success: true,
      status: 200,
      data: [...user.planHistory],
    });

  
  } catch (error) {
    console.log(error);
  }
});


router.post("/kyc/alert", async (req, res) => {
  const {firstName} = req.body;

  

  try {
    res.status(200).json({
      success: true,
      status: 200,
     message:"admin alerted",
    });

    sendKycAlert({
      firstName
    })
  
  } catch (error) {
    console.log(error);
  }
});


router.post("/:_id/withdrawal", async (req, res) => {
  const { _id } = req.params;
  const { method, address, amount, from ,account,to,timestamp} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    await user.updateOne({
      withdrawals: [
        ...user.withdrawals,
        {
          _id: uuidv4(),
          method,
          address,
          amount,
          from,
          account,
          status: "pending",
          timestamp
        },
      ],
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: "Withdrawal request was successful",
    });

    sendWithdrawalEmail({
      amount: amount,
      method: method,
     to:to,
      address:address,
      from: from,
    });

    sendWithdrawalRequestEmail({
      amount: amount,
      method: method,
      address:address,
      from: from,
    });
  } catch (error) {
    console.log(error);
  }
});

// router.put('/approve/:_id', async (req,res)=>{
//   const { _id} = req.params;
//   const user = await UsersDatabase();
//   const looper=user.map(function (userm){
  
//     const withdd=userm.withdrawal.findOne({_id})
  
//   withdd.status="approved"
//    })
//    looper();

//    res.send({ message: 'Status updated successfully', data });

// })

// // endpoint for updating status
// router.put('/update-status/:userId/:_id', async (req, res) => {

//   const { _id} = req.params; // get ID from request parameter
//   const { userId}=req.params;
//   // const user = await UsersDatabase.findOne({userId}); // get array of objects containing ID from request body


//   const withd=user.withdrawals.findOne({_id})
// user[withd].status="approved"
 

// // find the object with the given ID and update its status property
//   // const objIndex = data.findIndex(obj => obj._id === _id);
//   // data[objIndex].status = 'approved';

//   // send updated data as response

//   if (!userId) {
//     res.status(404).json({
//       success: false,
//       status: 404,
//       message: "User not found",
//     });

//     return;
//   }

//   res.send({ message: 'Status updated successfully', data });
// });

router.put("/:_id/withdrawals/:transactionId/confirm", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const withdrawalsArray = user.withdrawals;
    const withdrawalTx = withdrawalsArray.filter(
      (tx) => tx._id === transactionId
    );

    withdrawalTx[0].status = "Approved";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      withdrawals: [
        ...user.withdrawals
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Transaction approved",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});




router.put("/:_id/withdrawals/:transactionId/decline", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const withdrawalsArray = user.withdrawals;
    const withdrawalTx = withdrawalsArray.filter(
      (tx) => tx._id === transactionId
    );

    withdrawalTx[0].status = "Declined";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      withdrawals: [
        ...user.withdrawals
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Transaction Declined",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});


router.get("/:_id/withdrawals/history", async (req, res) => {
  console.log("Withdrawal request from: ", req.ip);

  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    res.status(200).json({
      success: true,
      status: 200,
      data: [...user.withdrawals],
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
