Count Filters (Thunderbird extension)
=====================================

This code provides an extension for Mozilla Thunderbird email client that adds a few search filters used to count values. This filters are :

* number of total message recipients (To+Cc+Bcc)
* size of message body
* number of words in body message
* number of lines in body message
* number of links in body message

Those filters can be especially useful to try an filter message with scarce content or adressed to a large number of people.

Do not expect much accuracy in body size (although it is much more useful than total message size, which gives no indication at all since the message can be bloated with non visible data), as no effort is put into properly decoding it with the indicated charset.

Installation
------------
The simplest way to install this plugin is to get it directly through the Thundebird add-on manager.

Alternatively, you can create the extension .xpi archive by using the provided makefile with
```
make
```
then select it through the "Install add-on from file" options in the add-on manager tools.

Usage
-----
You can select which of the filters you want to display in the preferences.
Then you can apply them in the global search function like all the standard filters.

License
-------
This code is under GPLv3 license (see LICENSE file).