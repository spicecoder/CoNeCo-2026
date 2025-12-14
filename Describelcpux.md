 Complete CPUX Field Model

 It is important to implement the formal model of cpux strictly without introducing any  simplification  to the required code for a particular use case, even if ,from technical perspective ,it may look redundant.

 We identify each intention space by its unique id ,denoted as ISn , where n =1.2..any integer.
 An ISn holds a fixed number of unique Objects ,Intentions Pulses, DNs ,CPUX all uniquely identified, as are the users of IS are identified by their UIds . The key point in intention Space is that the name of the entities are also the name of their run time instances created within an execution context starting from the userid or any DN starting that execution. So there is never a duplicate name of the same type of entity within an execution context and any execution context has a uniue address within the granularity of the DN and Obects.

 A CPUX is a sequence of Objects and DNs of Intention Space with a directed Intention in between , with the restriction that there is no two DNs without an Interim Object in the sequence. And no two members are there in the sequence without an Intention between them. Between a DN and the following Object , we say the left member emits the intention while the right member absorbs, the right member being an Object . The Object always reflects the Intention to a forward Object or a DN.

 An Object when not empty can work as a valve for what it reflects ;an empty object reflects what it receives. 

 The first member  of a CPUX is always an DN ,the last member is an Object with an optional reflected Intention-signal. The Objects in a CPUX give a persistency during an execution cycle to allow for a rollback and compensation for members of a  CPUX between the CPUX start and the CPUX stop for a particular invocation nonce of the CPUX. 
 A CPUX  always has a unique trigger intention (carrying a certain Signal) that starts the CPUX. It may have more than one  (not duplicate) trigger intention, as long as the intention and the accompanying signal hash combination is unique. Similarly a CPUX may have (optional) zero or more final emission Intention, each being identified by a unique intention id and signal hash combination.  (IS#)

 CPUX enforces following Principles regards to Intention Space interactions -

 Firstly - Process in Intention Space- any process that is executed in Intention Space (out side a DN) is by running a CPUX .
 Thus any context formed at run time is through a recognised sequence of registered Intention entities within a granularity of a DN or an Object.
 
 Secondly Interaction in Intention Space  - Any interaction between two DNs can only happen through two Intentions carring a Signal through at least one Object intermediary,
 one Intention being emited by a DN and another Intention being absorbed by the other DN ,with one or more  Objects in between working as a reflector of emited Intention to the absorbed Intention. This DN to DN comminication is called a Link.
 Any DN or Object in a CPUX is referred to as a execution point.

Thirdly -DataTransfer in Intention Space -Any data trnasfer between two Intention Space components occur through an explicit Intention carrying a bunch of Pulse with Resonses ,refered to as a Signal so each such transfer can always be identified by a IntentionSignal# (IS#). 

Fourth - UI interaction in Intention Space - A DN can render an UI model within Intention Space by rendering a Gridlookout-with the following convention:
 The DN emits an intention with a signal;An Object in GL reflects that into Grid Cells with one cell per pulse (and its response data)-A cell is defined determinstically for any display device using grid lookout coordinates which provides 
 a.number of rows and coluns break up the viewport
 b.the start row/col of a cell 
 c.the layer number
 d.total number of rows and columns for the cell. 

 A Cell is editable if the Pulse for the cell has a TV as 'N', else the pulse is display only. If it is editable response array takes one row each for each entry
 in the array. A pulse with TV as 'UN' is for action e.g button .

The gridlookout spec for a cell may carry custom attributes for the cell.
An action may be configured to emit an intention  with its Signal to an Object .


Thus a  CPUX provides a designed sequence of execution along with Intention Signal passage from DN to Object,Object to Object and Object to DN, it makes sure any excution is initiated by an Intention being absorbed along with the designated Signal and there is always an Object that absorbs any inention that a DN can emit.

This way of of computation progression through CPUX and its member sequence does allow an unique address of execution for any particular context of computation in an intention space or even across intention spaces-where context is defined as the sequence of components ran at run time within the CPUX or started by a CPUX.

A DN Execution Unit is the  execution of a single DN and follows the pattern: I1-DN-I*-O where I1 is the absorbed intention to start the DN, I* is any emited intention from DN (because DN is a blackbox we can't be certain,although we can design, what it will emit at run time) and O is an Object. 
DN is allocated a GateKeeper area which has the designated Intention+Signal and emited Intention+Signal 

An Object execution unit is I*-O-I2 ,at run time an Object O absorbs I* ,i.e any intention emitted by the prior member ,however it is configured to only emit intention I2 e.g., that it is configured to emit.

A design time configured unit connecting two DNs is refereed to as link, can be seen as a combination of  two DN execution units with some interim Object execution units, thus we have a more general characterisation of link:

I1-DN1-I*-O-I2-(o2-iy-o3-iz)-DN2-I* ; because DN is a black box , it makes sense that our model  allow any intention+signal that a DN emits at run time being absorbed by object forward .
This makes it possible to start a new CPUX by reflecting the right intention from the Object. 
However,by design , the configuration may indicate the desired intention emitted from a DN ,thus the link DN1-I1-O-I2-DN2 would mean O is configured to reflect the designated Intention I1 into  I2 and send to DN2, while at the same time an Object can reflect a registered trigger intention to start a new CPUX. That means DN1 may choose to start a new CPUX at run time that differs from the desired 'happy path'. This run time configuration approach allows every possible outcome from a DN be treated as a happy path ran through multiple CPUX or merge a tradition happy path and exception path into a single CPUX loop. These connected CPUX forms a CPUX mesh at run time. But we shall mainly focus on running of a single CPUX as a forward sequence of designated DNs and Objects with intermediate Intention+Pulses.

CPUX -integrity->
A CPUX,from its  starting member to any prticular member provides the context of the execution for that member, 
The purpose of CPUX is to make an unique address for a  context of any execution point,this is ensured by having uique id for each of the entries in CPUX- i.e each Intention ,DN,O in the CPUX sequence. 
A link can also be stored in DB and refered to with a name and a CPUX can be constructed with a link as its member,during the CPUX design, but that does not have any effect on the run time behaviour of the CPUX or to the unique context address for each execution point,as each CPUX is treated as a liner sequence with no nesting. 



Execution model- a  Visitor visits each member and faclitates Intention transmission through Field.

The Field is defined as a collection of Intentions and a collection of Pulses put together.
We define two kinds of Field 1.CPUX-Field  2. Object-Field
A single CPUX-Field exist for a single CPUX run. 

The Object-Field can be within each Object participating in a CPUX.

A field can work as a source for any  designated forward Intention+Signal-referred as target in a synctest.

A Field absobs an Intention+Signal , puts the intention in the Intention Collection, put the pulses in the Signal in its Pulse collection , over writing any existing member - we shall refer to this act as absorption.

A Synctest can be performed for any target Intention+Signal .

A Synctest is success if and only if the target Intention is a member in the source Intention Set and all the pulses in the target Signal does exist in the source Pulse set.

The CPUX-Field then works as a synctest source for a DN for the Intention+Signal designated to the incoming Intention+Signal for that DN.

Similarly the Object-Field then works as a synctest source for  the Intention+Signal designated as being reflected from the Object.

The SyncTest thus works as a run time forwarding mechanism of any Intention+Signal designated to be absorbed by a DN or designated to be reflected from an Object. 

 In our model execution of a CPUX is equivalent to a visitor visiting each member of the CPUX sequence repeatedly, starting from the first one after absorbing the trigger intention ,there by creating a Field collection which the visitor carries along during the visits. The Visitor goes through the passes from the first member to the last until a  'golden pass' is reached,as described below.


So A CPUX-Field effectively absorbs Intention+Pulses emitted by a DN from the Object next to it in the sequence forward, while the Object-Field gathers the design time specified Intention-Pulses received by the Object in the current CPUX, after applying any mapping specified in the Object, if there ia any.

Field collection (both CPUX field and the Object field) of the visitor keeps growing as execution proceeds and the visitor keeps visiting each member and meeting the Gatekeeper at each member execution point during each pass. Gatekeeper plays a crucial role in transferring Intention+Signal while maintaining the design time spcification.

Gatekeeper executes synctest for various Intention+Signals,at the execution points in a CPUX. Gatekeeper also works as a cache to hold the emitted intention+signal from a DN to be picked up by the Visitor and a cache at Object to hold any un designated Intention+Signal before they trigger new CPUX and for mapping into designated Intention+Signal to be released into the CPUX-Field. 

DN-Gatekeeper works at every DN , it checks whether the CPUX-Field source and the designated incoming Intention+Signal as target passes the synctest, if so it can proceded to invoke the execution mechanism of that DN. For the First DN member it takes the trigger intention+signal as the designated intention+signal.

Object-Gatekeeper works at every Object , it checks whether the Object-Field source and the designated reflecting Intention+Signal as target passes the synctest, if so it releases the reflected Intention+Signal to be absorbed by the CPUX-Field.
     


 For a DN - the DN absorbs the configured Intention (along with the run time signal that Field carry)if and only if the FCPUX-field matches and passes the synctest for the gatekeeper at the DN. The absorbed intention and pulse set is optionaly (by configuration) removed from the Field collections. 

  An Object member in the CPUX absorbs any incoming intention ,with the Signal and adds the intention and pulses in the Object-Field. [OIS, OPS]

  And similarly for an Object , the gatekeeper for an Object ensures the object reflects an Intention,if and only ,if the synctest inside the object matches with the configured reflection intention along wih the run time accumulated signal inside the object. the reflected signal can be optionaly, configured to remove the intention and signal from the Object-Field.

Thus gatekeeper can be a general class which takes the Field and the Pickup from the visitor and provides a synctest for the intention to be absorbed by a DN from the Field or an intention to be reflected from an  Object into the Field after absoring the Pickup from the visitor emptied into an Object-Field. It is to be noted the Pickup area with the visitor is empty on each DN visit by visitor. It is only after a visit to DN that the pickup area of the visitor can get populated. When an Intention gets reflected by an Object ,it gets absorbed into the Field carried by the visitor.
This visitor model of CPUX execution process means the same dynamics holds true whether the CPUX members are all in a single machine or they are distributed across several.    

With this description of the conceptual entities involved in the dynamics , we shall describe the full CPUX execution step details below:
The description of CPUX execution shall define the  execution class of a CPUX.

------------------------------------------------------------------------------------
 To be more explicit and establish the terminology ,we can take the following as a reference example CPUX to detail the CPUX process:
 exampleCPUX = I1(s1)->[DN1,I3(s3),O1,I4(s4),DN2,I5(s5),O2,I6(S6)]

 In the exampleCPUX , the trigger Intention I1 carrying s1 as the signal. DN1 is the 'starter' Object and O2 is the 'ending' Object , I6 is the final intention emited from the CPUX carrying the signal s6.

 Inside the CPUX  a field drives the behaviour of members .The starter DN1 absorb the trigger Intention (which also initiates th field,as explained further below), DN1 would absorb the intention through a gatekeeper (explained further below) , emit intention I3 with signal s3, which O1 absorbs unconditionaly, O1 reflects I4,with signal s4 if condition within Object O1 is right through the gatekeeper(explined below), I4 , carrying signal s4- is absorbed in the Field and absorbed by DN2 if the field condition is right ,which emits I5(s5) and O2 absorbs that finally,subject to gatekeeper inside Object, emitting I6(s6) from the CPUX. 

 In the following we describe the Visitor ,Gatekeeper and the CPUX running process that will reveal what the 'condition meeting' referred above means in 'run time' relative to what is 'designed/ designated' as a CPUX sequence presented above. 

 This view of field and gatekeeper conditioned progress of a sequence is not present when we just write traditional instruction sequence in the traditional programming. The Intention space model brings this concept through the introduction of Intention carrying certain Signal (Intention+Signal)  (irrespective of the response value carried by the signal ) and the presence of  CPUX-Field to capture emitted Intention,or the presence of Object-Field to reflect Intention from an Object (within the current CPUX or trigger new CPUX) treating that as a separate event )

 CPUX _Process described: 
 CPUX -Start
 At the start the Trigger Intention carrying the Signal causes the Visitor to come alive (i.e constructed)  and the incoming intention +signal gets absorbed in the CPUX-Field collection of the visitor, the Intention is collected in the Intention Set(FIS) and the signal is collected in the  Pulses Set in the Field (FPS)
 A Visitor also carries a Pickup area which is a set of Intention+signal (PIS), which is left empty at the start.
   Thus Visitor can be represented as Visitor[FIS,FPS,PIS]
   

  Each member in a CPUX also has a gatekeeper attached,for a DN this gatekeeper works with the CPUX-Field ,controlling the absorption of the designated intention into the DN, in case of Object,this gatekeeper is inside the Object, using Object-Field for controlling the emission of the  designated reflected intention from the Object or trigger intentions for new CPUX.

 The gatekeeper holds a pass-area for a DN has the designated Input Intention-Signal,and the Output Intention-Signal produced by the DN after its execution. 
 The gatekeeper area for an Object holds the designated  incoming Intention+Signal,along with mapping rule ,the reflected intention+signal.  

When the visitor visits a DN member , the gatekeeper checks if the member is busy/ready/stopped. if the member is busy gatekeeper signals the visitor to move to the next (Object) member and the Visitor pickup area remains empty; 

If the member is stopped or member is ready, the gatekeeper first checks if the member DN has any intention+signal emitted in the pass-area allocated for that dn(it is allowed to emit any) - and if so it passes those to the visitor's Pickuparea, then the gatekeeper has to check if visitors CPUX-Field has the designated incoming intention and whether the designated signal is a subset of the  pulses in the visitor's Cpux-Field ; if this matches ,the synctest passes and the DN member is started (async process starts) and visitor moves on to next Object.

For a Object member,the visitor empties his Pickup area to the object-Field (Intention set and Object Pulse set) (OIS,OPS).

Gatekeeper first looks for if designated input Intention+Signal is in the Object Field thru SyncTest  -if so it first  maps the input signal (if any Mapping configured in the Object) and checks if it matches designated reflected Intention+signal , if so the reflected Intention+signal is absorbed into CPUX-Field of the visitor and is emptied from Object-Field- if it does not match the Object-Field remain the same.

For Intention in Object-Field, where Intention does not match the designated incoming Intention into the Object, the Gatekeeper checks if the Intention matches any trigger Intention+Signal using the Object-CPUX as the source in the Sync-test, if so that new CPUX is started .  This CPUX trigger process can occur async by configuration , there can be more than one such trigger Intentions, while Visitor moves on. 
 
 When visitor reaches the end member , it starts a new pass from the first member again-which is a DN with the incoming Intention+Signal being the trigger Intention+Signal for the CPUX. For the last Object member , the reflected intention is considered as an emission out of the CPUX and it does not add to the Visitors CPUX-Field. 

Golden-Pass:
As the visitor continues in his passes, it is noted whether any member emits or reflects Intention or any DN is triggered or in execution state, if in a certain pass none of these happens , that pass is a golden pass and the visitor pass or the CPUX loop stops and execution of a CPUX terminates.  

The above description of CPUX execution process does open up some standard interfaces with the DN and also with Object as a shared resource with Field,Visitor and Gatekeeper - as described below:

1. DN is executed async by a execute async call passing designated incoming Intention+Signal - after execution the result are put in the gatekeeper pass-area as one or more Intention+Signals 

2. Gatekeeper pass area is emptied into Visitor Pick-up area. 

3. At Object, the Visitor Pick-up area is emptied into Object-Field.
 Object has to check if the designated incoming Intention+Signal is synctest +ve aginst the Object -Field as a source, if so it uses configured Map (if any) to  map Object-Field, then it chcks if the designated reflected Intention+Signal is synctest +ve against the Object-Field as source, if so the reflected Intention+Signal is removed from Object-field and absorbed into CPUX-Field.
 So Visitors pick-up area always gets emptied at the first Object after a DN.

