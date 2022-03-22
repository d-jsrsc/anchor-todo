use anchor_lang::prelude::*;

use crate::{TodoListError, item_add::ListItem, todo_list::TodoList, name_seed};

#[derive(Accounts)]
#[instruction(list_name: String)]
pub struct Cancel<'info> {
    #[account(
        mut, 
        has_one = list_owner @ TodoListError::WrongListOwner, 
        seeds = [
            b"todolist",
            list_owner.to_account_info().key.as_ref(),
            name_seed(&list_name)
        ],
        bump = list.bump
    )]
    pub list: Account<'info, TodoList>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub list_owner: AccountInfo<'info>,
    #[account(mut)]
    pub item: Account<'info, ListItem>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, address = item.creator @ TodoListError::WrongItemCreator)]
    pub item_creator: AccountInfo<'info>,
    pub user: Signer<'info>,
}
