use anchor_lang::prelude::*;

use crate::todo_list::*;
use crate::{name_seed, TodoListError};

#[derive(Accounts)]
#[instruction(list_name: String, item_name: String, bounty: u64)]
pub struct Add<'info> {
    #[account(
        mut,
        has_one = list_owner @ TodoListError::WrongListOwner,
        seeds = [
            b"todolist",
            list_owner.to_account_info().key.as_ref(),
            name_seed(&list_name)
        ],
        bump=list.bump
    )]
    pub list: Account<'info, TodoList>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub list_owner: AccountInfo<'info>,
    // 8 byte discriminator
    #[account(init, payer = user, space = ListItem::space(&item_name))]
    pub item: Account<'info, ListItem>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ListItem {
    pub creator: Pubkey,
    pub creator_finished: bool,
    pub list_owner_finished: bool,
    pub name: String,
}

impl ListItem {
    fn space(name: &str) -> usize {
        // discriminator + creator pubkey + 2 bools + name string
        8 + 32 + 1 + 1 + 4 + name.len()
    }
}
